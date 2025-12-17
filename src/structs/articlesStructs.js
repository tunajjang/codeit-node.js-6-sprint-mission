import * as s from 'superstruct';
import { PageParamsStruct } from './commonStructs.js';

export const GetArticleListParamsStruct = PageParamsStruct;

export const CreateArticleBodyStruct = s.object({
  title: s.coerce(s.nonempty(s.string()), s.string(), (value) => value.trim()),
  content: s.nonempty(s.string()),
  image: s.nullable(s.string()),
});

export const UpdateArticleBodyStruct = s.partial(CreateArticleBodyStruct);
