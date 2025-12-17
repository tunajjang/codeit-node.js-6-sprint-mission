import { create } from 'superstruct';
import { prismaClient } from '../lib/prismaClient.js';
import NotFoundError from '../lib/errors/NotFoundError.js';
import ForbiddenError from '../lib/errors/ForbiddenError.js';
import { IdParamsStruct } from '../structs/commonStructs.js';
import {
  CreateArticleBodyStruct,
  UpdateArticleBodyStruct,
  GetArticleListParamsStruct,
} from '../structs/articlesStructs.js';
import { CreateCommentBodyStruct, GetCommentListParamsStruct } from '../structs/commentsStruct.js';

export async function createArticle(req, res) {
  const data = create(req.body, CreateArticleBodyStruct);
  const user = req.user;

  const article = await prismaClient.article.create({ data: { ...data, authorId: user.id } });

  return res.status(201).send({ message: 'article 생성됨', article });
}

export async function getArticle(req, res) {
  const { id } = create(req.params, IdParamsStruct);
  const user = req.user;

  const article = await prismaClient.article.findUnique({ where: { id } });
  if (!article) {
    throw new NotFoundError('article', id);
  }

  const isLiked = await prismaClient.likeArticle.findFirst({
    where: { userId: user.id, articleId: id },
  });

  return res.send({ article: article, isLike: Boolean(isLiked) });
}

export async function updateArticle(req, res) {
  const { id } = create(req.params, IdParamsStruct);
  const data = create(req.body, UpdateArticleBodyStruct);
  const user = req.user;

  const article = await prismaClient.article.findUnique({ where: { id } });
  if (!article) {
    throw new NotFoundError('article', articleId);
  }

  if (article.authorId !== user.id) {
    throw new ForbiddenError('article', articleId);
  }

  const updateArticle = await prismaClient.article.update({ where: { id }, data });

  return res.send({ message: 'article 수정됨', updateArticle });
}

export async function deleteArticle(req, res) {
  const { id } = create(req.params, IdParamsStruct);
  const user = req.user;

  const article = await prismaClient.article.findUnique({ where: { id } });
  if (!article) {
    throw new NotFoundError('article', id);
  }

  if (article.authorId !== user.id) {
    throw new ForbiddenError('article', articleId);
  }

  await prismaClient.article.delete({ where: { id } });

  return res.status(204).send({ message: 'article 삭제됨' });
}

export async function getArticleList(req, res) {
  const { page, pageSize, orderBy, keyword } = create(req.query, GetArticleListParamsStruct);

  const where = {
    title: keyword ? { contains: keyword } : undefined,
  };

  const totalCount = await prismaClient.article.count({ where });
  const articles = await prismaClient.article.findMany({
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: orderBy === 'recent' ? { createdAt: 'desc' } : { id: 'asc' },
    where,
  });

  return res.send({
    list: articles,
    totalCount,
  });
}

export async function createComment(req, res) {
  const { id: articleId } = create(req.params, IdParamsStruct);
  const { content } = create(req.body, CreateCommentBodyStruct);
  const user = req.user;

  const existingArticle = await prismaClient.article.findUnique({ where: { id: articleId } });
  if (!existingArticle) {
    throw new NotFoundError('article', articleId);
  }

  const comment = await prismaClient.comment.create({
    data: {
      articleId,
      content,
      authorId: user.id,
    },
  });

  return res.status(201).send(comment);
}

export async function getCommentList(req, res) {
  const { id: articleId } = create(req.params, IdParamsStruct);
  const { cursor, limit } = create(req.query, GetCommentListParamsStruct);

  const article = await prismaClient.article.findUnique({ where: { id: articleId } });
  if (!article) {
    throw new NotFoundError('article', articleId);
  }

  const commentsWithCursor = await prismaClient.comment.findMany({
    cursor: cursor ? { id: cursor } : undefined,
    take: limit + 1,
    where: { articleId },
    orderBy: { createdAt: 'desc' },
  });
  const comments = commentsWithCursor.slice(0, limit);
  const cursorComment = commentsWithCursor[commentsWithCursor.length - 1];
  const nextCursor = cursorComment ? cursorComment.id : null;

  return res.send({
    list: comments,
    nextCursor,
  });
}

export async function likeArticle(req, res) {
  try {
    const { id } = create(req.params, IdParamsStruct);
    const userId = req.user.id;

    const like = await prismaClient.likeArticle.create({ data: { userId, articleId: id } });
    res.status(200).send({ message: 'Like!', like });
  } catch (err) {
    return res.status(400).send('already liked Article!');
  }
}

export async function dislikeArticle(req, res) {
  try {
    const { id } = create(req.params, IdParamsStruct);
    const userId = req.user.id;

    const likeArticleFind = await prismaClient.likeArticle.findFirst({
      where: { articleId: id, userId: userId },
    });

    if (!likeArticleFind) {
      throw new NotFoundError('no liked Article', likeArticleFind.id);
    }

    const dislikeArticle = await prismaClient.likeArticle.delete({
      where: { id: likeArticleFind.id },
    });

    res.status(200).send({ message: 'Dislike!', dislikeArticle });
  } catch (err) {
    return res.status(400).send('already disliked Article');
  }
}
