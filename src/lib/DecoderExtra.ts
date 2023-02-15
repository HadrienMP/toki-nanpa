import { Err, Ok, Result } from '@sniptt/monads/build';
import { Decoder } from 'elm-decoders';

export const parse = <T>(params: { raw: string; decoder: Decoder<T> }): Result<T, string> => {
  const result = params.decoder.run(JSON.parse(params.raw));
  switch (result.type) {
    case 'OK':
      return Ok(result.value);
    case 'FAIL':
      return Err(JSON.stringify(result.error));
  }
};
