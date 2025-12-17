import { create } from 'superstruct';
import { prismaClient } from '../lib/prismaClient.js';
import { UpdateCommentBodyStruct } from '../structs/commentsStruct.js';
import NotFoundError from '../lib/errors/NotFoundError.js';
import { IdParamsStruct } from '../structs/commonStructs.js';
import ForbiddenError from '../lib/errors/ForbiddenError.js';

export async function updateComment(req, res) {
  const { id } = create(req.params, IdParamsStruct);
  const { content } = create(req.body, UpdateCommentBodyStruct);
  const user = req.user;

  const existingComment = await prismaClient.comment.findUnique({ where: { id } });
  if (!existingComment) {
    throw new NotFoundError('comment', id);
  }
  if (existingComment.authorId !== user.id) {
    throw new ForbiddenError('comment', id);
  }

  const updatedComment = await prismaClient.comment.update({
    where: { id },
    data: { content },
  });

  return res.send({ message: 'comment 수정됨', updatedComment });
}

export async function deleteComment(req, res) {
  const { id } = create(req.params, IdParamsStruct);
  const user = req.user;

  const existingComment = await prismaClient.comment.findUnique({ where: { id } });
  if (!existingComment) {
    throw new NotFoundError('comment', id);
  }
  if (existingComment.authorId !== user.id) {
    throw new ForbiddenError('comment', id);
  }

  await prismaClient.comment.delete({ where: { id } });

  return res.status(204).send({ message: 'comment 삭제됨', existingComment });
}
