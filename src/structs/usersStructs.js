import * as s from 'superstruct';
import isEmail from 'is-email';

export const CreateUserBodyStruct = s.object({
  email: s.define('Email', isEmail),
  nickname: s.nonempty(s.string()),
  password: s.nonempty(s.string()),
  image: s.nullable(s.string()),
});

export const UpdateUserBodyStruct = s.partial(CreateUserBodyStruct);
