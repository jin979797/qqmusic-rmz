import Router from 'koa-router';

const router = new Router();

import context from '../controllers';

// cookies
router.get('/user/getCookie', context.getCookie);
router.get('/user/setCookie', context.setCookie);

// native QQ Music QR login
router.get('/login/qr/key', context.qrKey);
router.get('/login/qr/create', context.qrCreate);
router.get('/login/qr/check', context.qrCheck);
router.get('/login/qr/cancel', context.qrCancel);
router.get('/login/status', context.loginStatus);
router.get('/logout', context.logout);
router.get('/user/detail', context.userDetail);
router.get('/user/playlist', context.getUserPlaylist);
router.get('/user/albums', context.getUserAlbums);
router.get('/user/liked-songs', context.getUserLikedSongs);
router.get('/user/playlist-detail', context.getOwnedPlaylistSongs);

// downloadQQMusic
router.get('/downloadQQMusic', context.getDownloadQQMusic);

router.get('/getHotkey', context.getHotKey);

router.get('/getSearchByKey/:key?/:limit?/:page?/:catZhida?', context.getSearchByKey);

// search smartbox
router.get('/getSmartbox/:key?', context.getSmartbox);

// 1
router.get('/getSongListCategories', context.getSongListCategories);

router.get('/getSongLists/:page?/:limit?/:categoryId?/:sortId?', context.getSongLists);

router.post('/batchGetSongLists', context.batchGetSongLists);

// getSongInfo
router.get('/getSongInfo/:songmid?/:songid?', context.getSongInfo);
router.post('/batchGetSongInfo', context.batchGetSongInfo);

// 4
// disstid=7011264340
router.get('/getSongListDetail/:disstid?', context.getSongListDetail);

// newDisk
router.get('/getNewDisks/:page?/:limit?', context.getNewDisks);

// getMvByTag
router.get('/getMvByTag', context.getMvByTag);

// MV
// area_id=15&version_id=7
router.get('/getMv/:area_id?/:version_id?/:limit?/:page?', context.getMv);

// getSingerList
router.get('/getSingerList/:area?/:sex?/:genre?/:index?/:page?', context.getSingerList);

// getSimilarSinger
// singermid=0025NhlN2yWrP4
router.get('/getSimilarSinger/:singermid?', context.getSimilarSinger);

// getSingerAlbum
// singermid=0025NhlN2yWrP4
router.get('/getSingerAlbum/:singermid?/:limit?/:page?', context.getSingerAlbum);

router.get('/getSingerHotsong/:singermid?/:limit?/:page?', context.getSingerHotsong);

/**
 * @description: getSingerMv
 * @param order: time(fan upload) || listen(singer all)
 */
router.get('/getSingerMv/:singermid?/:limit?/:order?', context.getSingerMv);

router.get('/getSingerDesc/:singermid?', context.getSingerDesc);

router.get('/getSingerStarNum/:singermid?', context.getSingerStarNum);

// radio
router.get('/getRadioLists', context.getRadioLists);

// DigitalAlbum
router.get('/getDigitalAlbumLists', context.getDigitalAlbumLists);

// music
// getLyric
// songmid=003rJSwm3TechU
router.get('/getLyric/:songmid?/:isFormat?', context.getLyric);

// songmid=003rJSwm3TechU
router.get('/getMusicPlay/:songmid?', context.getMusicPlay);

// album
// albummid=0016l2F430zMux
router.get('/getAlbumInfo/:albummid?', context.getAlbumInfo);

router.get(
  '/getComments/:id?/:rootcommentid?/:cid?/:pagesize?/:pagenum?/:cmd?/:reqtype?/:biztype?',
  context.getComments,
);

// recommend
router.get('/getRecommend', context.getRecommend);

// mv play
router.get('/getMvPlay/:vid?', context.getMvPlay);

// rankList: getTopLists
router.get('/getTopLists', context.getTopLists);

// ranks
router.get('/getRanks/:topId?/:limit?/:page?', context.getRanks);

// ticket
router.get('/getTicketInfo', context.getTicketInfo);

// getImageUrl
router.get('/getImageUrl', context.getImageUrl);

// ================= 自定义音乐源适配器 =================
router.get('/api', async (ctx) => {
  const { server, type, id } = ctx.query;

  // 只处理 QQ音乐 (tencent) 的搜索
  if (server !== 'tencent' || type !== 'search') {
    ctx.status = 400;
    ctx.body = [];
    return;
  }

  try {
    // 1. 把 App 传来的 id 参数，伪装成 getSearchByKey 需要的 key 参数
    // 我们直接修改请求的 query 参数，这样 getTypedQuery 就能正常读取了
    ctx.request.query = { ...ctx.request.query, key: String(id || ''), limit: '30', page: '1', catZhida: '0' };

// 2. 调用你现成的控制器去搜索
    await context.getSearchByKey(ctx);
    
    // ⚠️ 新增：打印原始数据，看看它到底长啥样
    console.log('==== 服务器拿到原始数据 ====');
    console.log(JSON.stringify(ctx.body).substring(0, 1000));

    // 3. 尝试兼容多种可能的数据结构
    let rawResult = ctx.body as any;
    if (typeof rawResult === 'string') {
      try { rawResult = JSON.parse(rawResult); } catch (e) {}
    }

    // 尝试从多个可能的位置获取歌曲列表
let songList = rawResult?.response?.data?.song?.list || 
               rawResult?.data?.song?.list || 
               rawResult?.data?.list || 
               rawResult?.list || [];
    console.log('==== 提取到的歌曲数量 ====', songList.length);
    
    // 4. 把数据转换成音乐 App 需要的 Meting-API 格式
    const metingData = songList.map((song: any) => ({
      name: song.name, // 歌曲名
      artist: song.singer?.map((s: any) => s.name).join(' / '), // 歌手
      url: song.mid, // 歌曲ID（App会拿这个去请求播放链接）
      pic: `https://y.gtimg.cn/music/photo_new/T002R300x300M000${song.album?.mid}.jpg`, // 封面图
      lrc: `https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${song.mid}&format=json&nobase64=1` // 歌词接口
    }));

    // 5. 返回给音乐 App
    ctx.body = metingData;
  } catch (error) {
    console.error('Meting API 转换出错:', error);
    ctx.status = 500;
    ctx.body = [];
  }
});
// =======================================================

export default router;
