import { Catch, HttpException, type ExceptionFilter, type ArgumentsHost } from "@nestjs/common";

@Catch()
export class ApiErrorsFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const text = `${(error as Error)?.message ?? ""}`;
    const code = (error as { code?: string })?.code;
    if (error instanceof HttpException) {
      return response.status(error.getStatus()).json(error.getResponse());
    }
    if (code === "P2002" || /exclusion constraint|already|overlap|locked|closed|history|cannot rewrite|in use|deadlock|serialization/i.test(text)) {
      return response.status(409).json({ statusCode: 409, message: "Conflit : cette ressource existe ou n'est plus modifiable. Rechargez les données." });
    }
    if (code === "P2003" || code === "P2025" || /check constraint|must be inside|scale|invalid input/i.test(text)) {
      return response.status(400).json({ statusCode: 400, message: "Les données ou les références sont incohérentes." });
    }
    return response.status(503).json({ statusCode: 503, message: "Le service est momentanément indisponible." });
  }
}
