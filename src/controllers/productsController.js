import { create } from 'superstruct';
import { prismaClient } from '../lib/prismaClient.js';
import NotFoundError from '../lib/errors/NotFoundError.js';
import ForbiddenError from '../lib/errors/ForbiddenError.js';
import { IdParamsStruct } from '../structs/commonStructs.js';
import {
  CreateProductBodyStruct,
  GetProductListParamsStruct,
  UpdateProductBodyStruct,
} from '../structs/productsStruct.js';
import { CreateCommentBodyStruct, GetCommentListParamsStruct } from '../structs/commentsStruct.js';

//기본 주요 기능
export async function createProduct(req, res) {
  const { name, description, price, tags, images } = create(req.body, CreateProductBodyStruct);
  const user = req.user;

  const product = await prismaClient.product.create({
    data: { name, description, price, tags, images, authorId: user.id },
  });

  res.status(201).send({ message: 'product 생성됨', product });
}

export async function getProduct(req, res) {
  const { id } = create(req.params, IdParamsStruct);
  const user = req.user;

  const product = await prismaClient.product.findUnique({ where: { id } });
  if (!product) {
    throw new NotFoundError('product', id);
  }

  const isLiked = await prismaClient.likeProduct.findFirst({
    where: { userId: user.id, productId: id },
  });

  return res.send({ product: product, isLike: Boolean(isLiked) });
}

export async function updateProduct(req, res) {
  const { id } = create(req.params, IdParamsStruct);
  const { name, description, price, tags, images } = create(req.body, UpdateProductBodyStruct);
  const user = req.user;

  const existingProduct = await prismaClient.product.findUnique({ where: { id } });
  if (!existingProduct) {
    throw new NotFoundError('product', id);
  }

  if (existingProduct.authorId !== user.id) {
    throw new ForbiddenError('product', id);
  }

  const updatedProduct = await prismaClient.product.update({
    where: { id },
    data: { name, description, price, tags, images },
  });

  return res.send({ message: 'product 수정됨', updatedProduct });
}

export async function deleteProduct(req, res) {
  const { id } = create(req.params, IdParamsStruct);
  const user = req.user;
  const existingProduct = await prismaClient.product.findUnique({ where: { id } });

  if (!existingProduct) {
    throw new NotFoundError('product', id);
  }

  if (existingProduct.authorId !== user.id) {
    throw new ForbiddenError('product', id);
  }

  await prismaClient.product.delete({ where: { id } });

  return res.status(204).send({ message: 'product 삭제됨' });
}

export async function getProductList(req, res) {
  const { page, pageSize, orderBy, keyword } = create(req.query, GetProductListParamsStruct);

  const where = keyword
    ? {
        OR: [{ name: { contains: keyword } }, { description: { contains: keyword } }],
      }
    : undefined;
  const totalCount = await prismaClient.product.count({ where });
  const products = await prismaClient.product.findMany({
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: orderBy === 'recent' ? { id: 'desc' } : { id: 'asc' },
    where,
  });

  return res.send({
    list: products,
    totalCount,
  });
}

//댓글 기능
export async function createComment(req, res) {
  const { id: productId } = create(req.params, IdParamsStruct);
  const { content } = create(req.body, CreateCommentBodyStruct);
  const user = req.user;

  const existingProduct = await prismaClient.product.findUnique({ where: { id: productId } });
  if (!existingProduct) {
    throw new NotFoundError('product', productId);
  }

  if (existingProduct.authorId !== user.id) {
    throw new ForbiddenError('product', productId);
  }

  const comment = await prismaClient.comment.create({
    data: { productId, content, authorId: user.id },
  });

  return res.status(201).send(comment);
}

export async function getCommentList(req, res) {
  const { id: productId } = create(req.params, IdParamsStruct);
  const { cursor, limit } = create(req.query, GetCommentListParamsStruct);

  const existingProduct = await prismaClient.product.findUnique({ where: { id: productId } });
  if (!existingProduct) {
    throw new NotFoundError('product', productId);
  }

  const commentsWithCursorComment = await prismaClient.comment.findMany({
    cursor: cursor ? { id: cursor } : undefined,
    take: limit + 1,
    where: { productId },
  });
  const comments = commentsWithCursorComment.slice(0, limit);
  const cursorComment = commentsWithCursorComment[comments.length - 1];
  const nextCursor = cursorComment ? cursorComment.id : null;

  return res.send({
    list: comments,
    nextCursor,
  });
}

//좋아요 기능

export async function likeProduct(req, res) {
  try {
    const { id } = create(req.params, IdParamsStruct);
    const userId = req.user.id;

    const like = await prismaClient.likeProduct.create({ data: { userId, productId: id } });
    res.status(200).send({ message: 'Like!', like });
  } catch (err) {
    return res.status(400).send('already liked Product!');
  }
}

export async function dislikeProduct(req, res) {
  try {
    const { id } = create(req.params, IdParamsStruct);
    const userId = req.user.id;

    const likeProductFind = await prismaClient.likeProduct.findFirst({
      where: { ProductId: id, userId: userId },
    });

    if (!likeProductFind) {
      throw new NotFoundError('no liked Product', likeProductFind.id);
    }

    const dislikeProduct = await prismaClient.likeProduct.delete({
      where: { id: likeProductFind.id },
    });

    res.status(200).send({ message: 'Dislike!', dislikeProduct });
  } catch (err) {
    return res.status(400).send('already disliked Product');
  }
}
