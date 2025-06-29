import { IsInt, IsString } from 'class-validator';

export class CreateItemDto {
  @IsString()
  readonly name: string;

  @IsInt()
  readonly age: number;

  @IsString()
  readonly breed: string;
}
