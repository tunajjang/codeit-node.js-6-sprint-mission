import { create } from 'superstruct';
import { prismaClient } from '../lib/prismaClient.js';
import bcrypt from 'bcrypt';

import { CreateUserBodyStruct } from '../structs/usersStructs.js';
import { generateTokens, verifyAccessToken, verifyRefreshToken } from '../lib/token.js';
import { ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME, NODE_ENV } from '../lib/constants.js';

/*-------회원 가입 및 로그인 로그아웃 , 토큰 관련 컨트롤러------*/

export async function userRegister(req, res) {
  const { password, ...rest } = req.body;
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const data = create({ ...rest, password: hashedPassword }, CreateUserBodyStruct);

  const user = await prismaClient.user.create({ data });

  return res.status(201).send(user);
}

export async function userLogin(req, res) {
  const { nickname, password } = req.body;

  const user = await prismaClient.user.findUnique({ where: { nickname } });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const { accessToken, refreshToken } = generateTokens(user.id);
  setTokenCookies(res, accessToken, refreshToken);

  return res.status(200).send({ message: 'login success' });
}

export async function refreshTokens(req, res) {
  const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME];
  if (!refreshToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { userId } = verifyRefreshToken(refreshToken);

  const user = await prismaClient.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);
  setTokenCookies(res, accessToken, newRefreshToken);
  return res.status(200).send();
}

export async function userLogout(req, res) {
  clearTokenCookies(res);
  return res.status(200).send({ message: 'logout success' });
}

function setTokenCookies(res, accessToken, refreshToken) {
  res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    maxAge: 1 * 60 * 60 * 1000, // 1 hour
  });
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/auth/refresh',
  });
}

function clearTokenCookies(res) {
  res.clearCookie(ACCESS_TOKEN_COOKIE_NAME);
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME);
}

/*------유저 개인 정보 확인 및 수정 삭제 컨트롤러*/

export async function userInfo(req, res) {
  const user = req.user;
  const userData = await prismaClient.user.findUnique({
    select: {
      email: true,
      nickname: true,
      image: true,
      createdAt: true,
      likeProducts: {
        select: {
          product: {
            select: {
              name: true,
              description: true,
              price: true,
              tags: true,
              images: true,
            },
          },
        },
      },
    },
    where: { id: user.id },
  });
  return res.status(200).send(userData);
}

export async function userInfoPatch(req, res) {
  const user = req.user;
  const { password, ...rest } = req.body;

  if (password) {
    console.log('cna not change password');
  }

  const updateUser = await prismaClient.user.update({
    where: { id: user.id },
    data: rest,
    select: {
      email: true,
      nickname: true,
      image: true,
    },
  });
  return res.status(200).send({ message: 'updated userInfo', updateUser });
}

export async function userUploadProducts(req, res) {
  const user = req.user;
  const uploadProduct = await prismaClient.user.findMany({
    select: {
      products: {
        select: {
          name: true,
          description: true,
          price: true,
          tags: true,
          images: true,
        },
      },
    },
    where: { id: user.id },
  });
  return res.status(200).send({ message: 'uploaded user product sent', uploadProduct });
}

//------유저 리스트 확인용 디버깅 코드
export async function userList(req, res) {
  const userList = await prismaClient.user.findMany();
  return res.status(200).send(userList);
}
