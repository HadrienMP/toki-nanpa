import * as E from 'fp-ts/Either';
export const onSuccess: <R>(f: (a: R) => void) => <L>(e: E.Either<L, R>) => E.Either<L, R> = (f) =>
  E.map(peek(f));
export const peek =
  <A>(f: (arg: A) => void) =>
  (a: A): A => {
    f(a);
    return a;
  };
export const noop = () => {};
