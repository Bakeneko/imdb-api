import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class ControllerLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Controller');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { method, url } = context.switchToHttp().getRequest();
    const controller = context.getClass().name;
    const handler = context.getHandler().name;

    return next.handle().pipe(
      tap(() => {
        this.logger.log(`${method} ${url} -> ${controller}.${handler}()`);
      }),
    );
  }
}
