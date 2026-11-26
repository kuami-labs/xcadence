import { MAX_ENVIRONMENT_LENGTH, MAX_PRODUCTION_ENVIRONMENTS } from '@xcadence/shared';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** Environnements GitHub comptés comme production pour ce dépôt. */
export class DeployRuleDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_PRODUCTION_ENVIRONMENTS)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(MAX_ENVIRONMENT_LENGTH, { each: true })
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? [...new Set(value.map((v: unknown) => (typeof v === 'string' ? v.trim() : v)))]
      : value,
  )
  productionEnvironments!: string[];
}

/** PATCH /orgs/:orgId/repositories/:id : suivi du dépôt et environnements de production. */
export class UpdateRepositoryDto {
  @IsOptional()
  @IsBoolean()
  isTracked?: boolean;

  /** null : revenir à la règle par défaut (`production` ou `prod`). */
  @IsOptional()
  @ValidateNested()
  @Type(() => DeployRuleDto)
  deployRule?: DeployRuleDto | null;
}
