import express from 'express';
import { withAsync } from '../lib/withAsync.js';
import {
  refreshTokens,
  userList,
  userLogin,
  userLogout,
  userRegister,
  userInfo,
  userInfoPatch,
  userUploadProducts,
} from '../controllers/usersController.js';
import authenticate from '../middleware/authenticate.js';

const usersRouter = express.Router();

usersRouter.post('/register', withAsync(userRegister));
usersRouter.post('/login', withAsync(userLogin));
usersRouter.post('/refresh', withAsync(refreshTokens));
usersRouter.post('/logout', withAsync(userLogout));
usersRouter.get('/list', withAsync(userList));

usersRouter.get('/info', authenticate, withAsync(userInfo));
usersRouter.patch('/info', authenticate, withAsync(userInfoPatch));
usersRouter.get('/products', authenticate, withAsync(userUploadProducts));

export default usersRouter;
