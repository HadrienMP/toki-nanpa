import * as E from 'fp-ts/Either';
export const onSuccess: <R>(f: (a: R) => void) => <L>(e: E.Either<L, R>) => E.Either<L, R> = (f) =>
  E.map((it) => {
    f(it);
    return it;
  });
