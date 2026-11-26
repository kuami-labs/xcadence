import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

/** GET /orgs/:orgId/metrics?repo=&from=&to= ; sans repo : toute l'organisation. */
export class MetricsQueryDto {
  @IsOptional()
  @IsUUID()
  repo?: string;

  /** AAAA-MM-JJ ; par défaut 12 semaines avant `to`. */
  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string;

  /** AAAA-MM-JJ ; par défaut aujourd'hui. */
  @IsOptional()
  @IsISO8601({ strict: true })
  to?: string;
}
