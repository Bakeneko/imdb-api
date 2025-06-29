import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const apiKey = (req.headers['X-API-KEY'] || req.query.apikey) as
      | string
      | undefined;
    if (!apiKey || apiKey !== process.env.API_KEY) {
      throw new UnauthorizedException('Invalid API Key');
    }
    next();
  }
}
