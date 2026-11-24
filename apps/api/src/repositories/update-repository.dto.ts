import { IsBoolean, IsObject, IsOptional } from 'class-validator';

/** PATCH /orgs/:orgId/repositories/:id : suivi du dépôt et règle de détection des déploiements. */
export class UpdateRepositoryDto {
  @IsOptional()
  @IsBoolean()
  isTracked?: boolean;

  /** Forme libre pour l'instant (question ouverte du PRD) ; null pour l'effacer. */
  @IsOptional()
  @IsObject()
  deployRule?: Record<string, unknown> | null;
}
