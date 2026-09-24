import {findTopVideos} from '../youtube-top.mjs';

export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const {artist,localName='',channelId=''}=req.query||{};
  if(typeof artist!=='string'||artist.trim().length<2||artist.length>100||typeof localName!=='string'||localName.length>100||typeof channelId!=='string'||channelId&&!/^UC[\w-]{22}$/.test(channelId))return res.status(400).json({error:'Invalid artist'});
  const apiKey=process.env.YOUTUBE_API_KEY;
  if(!apiKey)return res.status(503).json({error:'YouTube ranking is unavailable'});
  try{
    const songs=await findTopVideos({artist:artist.trim(),localName,channelId,apiKey});
    res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json({songs,checkedAt:new Date().toISOString()});
  }catch(error){
    console.error('YouTube ranking unavailable',error);
    return res.status(502).json({error:'YouTube ranking is unavailable'});
  }
}
