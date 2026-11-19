import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service.js";
import type { AuthContext } from "../auth/auth-context.js";
import { day, object, optionalText, page, text, todayCivil, uuid } from "../../common/input.js";
import {
  parseRegisterStudentInput,
  parseStudentId,
} from "./register-student.input.js";

function hasPrismaErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(auth: AuthContext, query: Record<string, string> = {}) {
    const scope = enrollmentScope(auth);
    const search = query.search ? text(query.search, "Recherche", 100) : undefined;
    const classId = query.classId ? uuid(query.classId) : undefined;
    const schoolYearId = query.schoolYearId ? uuid(query.schoolYearId) : undefined;
    return this.prisma.client.student.findMany({
      where: {
        ...(scope || classId || schoolYearId
          ? { enrollments: { some: { ...scope, classId, schoolYearId } } }
          : {}),
        ...(search ? { AND: search.split(/\s+/).map(term => ({ OR: [
          { matricule: { contains: term, mode: "insensitive" as const } },
          { postName: { contains: term, mode: "insensitive" as const } },
          { user: { lastName: { contains: term, mode: "insensitive" as const } } },
          { user: { firstName: { contains: term, mode: "insensitive" as const } } },
        ] })) } : {}),
      },
      skip:(page(query.page)-1)*50,take:50,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        enrollments: {
          ...(scope ? { where: scope } : {}),
          include: {
            schoolClass: {
              select: {
                id: true,
                code: true,
                label: true,
                schoolYear: { select: { id: true, code: true } },
              },
            },
          },
          orderBy: { enrolledAt: "desc" },
        },
      },
      orderBy: { user: { lastName: "asc" } },
    });
  }

  registrationOptions() {
    return this.prisma.client.schoolYear.findMany({
      select: {
        id: true,
        code: true,
        classes: { select: { id: true, code: true, label: true }, orderBy: { code: "asc" } },
      },
      orderBy: { startsOn: "desc" },
    });
  }

  async findById(id: unknown,auth:AuthContext) {
    const studentId = parseStudentId(id);
    const scope = enrollmentScope(auth);
    const student = await this.prisma.client.student.findFirst({
      where: { id: studentId, ...(scope ? { enrollments: { some: scope } } : {}) },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        enrollments: {
          ...(scope ? { where: scope } : {}),
          include: {
            schoolClass: {
              select: {
                id: true,
                code: true,
                label: true,
                schoolYear: { select: { id: true, code: true } },
              },
            },
          },
        },
      },
    });
    if (!student) {
      throw new NotFoundException("Élève introuvable.");
    }
    return student;
  }

  async register(input: unknown,auth:AuthContext) {
    const data = parseRegisterStudentInput(input);

    try {
      return await this.prisma.client.$transaction(async (transaction) => {
        await transaction.$queryRaw`SELECT id FROM "SchoolClass" WHERE id=${data.classId}::uuid FOR UPDATE`;
        if(await transaction.classPeriod.count({where:{classId:data.classId,closedAt:{not:null}}}))throw new ConflictException("Inscription après clôture refusée.");
        const student=await transaction.student.create({
          data: {
            matricule: data.matricule,
            birthDate: data.birthDate,
            user: {
              create: {
                kind: "STUDENT",
                firstName: data.firstName,
                lastName: data.lastName,
                roles: { create: { role: "ELEVE" } },
              },
            },
            enrollments: {
              create: {
                classId: data.classId,
                schoolYearId: data.schoolYearId,
              },
            },
          },
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            enrollments: {
              include: {
                schoolClass: {
                  select: {
                    label: true,
                    schoolYear: { select: { code: true } },
                  },
                },
              },
            },
          },
        });
        await transaction.auditEntry.create({data:{actorId:auth.userId,action:"STUDENT_CREATED",targetType:"Student",targetId:student.id}});
        return student;
      });
    } catch (error) {
      if (hasPrismaErrorCode(error, "P2002")) {
        throw new ConflictException("Le matricule ou l’inscription existe déjà.");
      }
      if (hasPrismaErrorCode(error, "P2003")) {
        throw new BadRequestException("La classe ou l’année scolaire est invalide.");
      }
      throw error;
    }
  }

  async createRecord(body:unknown,auth:AuthContext) {
    const d=object(body);const data=recordData(d);
    return this.prisma.client.$transaction(async tx=>{
      const student=await tx.student.create({data:{...data,matricule:text(d.matricule,"Matricule",80),user:{create:{kind:"STUDENT",firstName:text(d.firstName,"Prénom"),lastName:text(d.lastName,"Nom"),roles:{create:{role:"ELEVE"}}}}}});
      await tx.auditEntry.create({data:{actorId:auth.userId,action:"STUDENT_CREATED",targetType:"Student",targetId:student.id}});return this.findIn(tx,student.id);
    });
  }
  async enroll(raw:string,body:unknown,auth:AuthContext) {
    const id=uuid(raw),d=object(body),classId=uuid(d.classId),schoolYearId=uuid(d.schoolYearId);
    return this.prisma.client.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "SchoolClass" WHERE id=${classId}::uuid FOR UPDATE`;
      const schoolClass=await tx.schoolClass.findFirst({where:{id:classId,schoolYearId},include:{classPeriods:true}});
      if(!schoolClass)throw new BadRequestException("Classe et année incohérentes.");
      if(schoolClass.classPeriods.some(cp=>cp.closedAt))throw new ConflictException("Cette classe a des résultats clôturés : inscription rétroactive refusée.");
      const enrollment=await tx.enrollment.create({data:{studentId:id,classId,schoolYearId}});
      await tx.auditEntry.create({data:{actorId:auth.userId,action:"STUDENT_ENROLLED",targetType:"Enrollment",targetId:enrollment.id}});return this.findIn(tx,id);
    });
  }
  async update(raw:string,body:unknown,auth:AuthContext) {
    const id=uuid(raw),d=object(body),data=recordData(d);
    return this.prisma.client.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "Student" WHERE id=${id}::uuid FOR UPDATE`;
      if(await tx.resultSnapshot.count({where:{enrollment:{studentId:id},classPeriod:{closedAt:{not:null}}}}))throw new ConflictException("Identité liée à des résultats clôturés : correction exceptionnelle à faire approuver.");
      await tx.student.update({where:{id},data:{...data,user:{update:{firstName:text(d.firstName,"Prénom"),lastName:text(d.lastName,"Nom")}}}});
      await tx.auditEntry.create({data:{actorId:auth.userId,action:"STUDENT_UPDATED",targetType:"Student",targetId:id}});return this.findIn(tx,id);
    });
  }
  private findIn(tx:any,id:string) {return tx.student.findUnique({where:{id},include:{user:{select:{id:true,firstName:true,lastName:true}},enrollments:{include:{schoolClass:{include:{schoolYear:true}}}}}});}
}

function recordData(d:Record<string,unknown>) {
 const sex=optionalText(d.sex,"Sexe",1);if(sex&&!['F','M'].includes(sex))throw new BadRequestException("Sexe invalide.");
 const birthDate=d.birthDate?day(d.birthDate):null;if(birthDate&&birthDate.toISOString().slice(0,10)>todayCivil())throw new BadRequestException("Date de naissance future refusée.");
 return {postName:optionalText(d.postName,"Postnom")??"",sex,birthDate,birthPlace:optionalText(d.birthPlace,"Lieu de naissance"),permanentNumber:optionalText(d.permanentNumber,"Numéro permanent",80),guardian:optionalText(d.guardian,"Responsable"),contact:optionalText(d.contact,"Contact",100)};
}
function enrollmentScope(auth: AuthContext) {
  if (auth.roles.some(role => role === "SEC" || role === "DIR")) return undefined;
  const now = day(todayCivil());
  return {
    schoolClass: {
      subjects: {
        some: {
          assignments: {
            some: {
              teacher: { userId: auth.userId },
              startsOn: { lte: now },
              OR: [{ endsOn: null }, { endsOn: { gt: now } }],
            },
          },
        },
      },
    },
  };
}
