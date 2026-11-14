import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service.js";
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

  list() {
    return this.prisma.client.student.findMany({
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        enrollments: {
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

  async findById(id: unknown) {
    const studentId = parseStudentId(id);
    const student = await this.prisma.client.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        enrollments: {
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

  async register(input: unknown) {
    const data = parseRegisterStudentInput(input);

    try {
      return await this.prisma.client.$transaction(async (transaction) =>
        transaction.student.create({
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
        }),
      );
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
}
