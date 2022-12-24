import cp from 'child_process';
import { Router } from "express";
import ffmpegPath from 'ffmpeg-static';
import stream from 'stream';
import ytdl from 'ytdl-core';

const router = Router();

router.get('/', (req, res) => {
    res.send('Hi!!!!');
});

router.get('/info', async (req, res) => {
    const url = req.query.url;
    await getInfo(url)
        .then(data => {
            return res.json(data);
        })
        .catch(error => {
            return res.status(404).send(error.message + url);
        });

});

router.get('/video', (req, res) => {
    const { url, name, quality } = req.query;
    res.header('Content-Disposition', `attachment; filename="${name}"`);
    ytmixer(`https://www.youtube.com/watch?v=${url}`, { quality }).pipe(res);
});

const getInfo = async (url) => {
    const info = await ytdl.getInfo(url);
    const name = info.videoDetails.title + '.mp4';
    const orginalVideosFormats = ytdl.filterFormats(info.formats, 'videoonly');
    const videosFormats = [];
    orginalVideosFormats.forEach(({ qualityLabel, itag }) => {
        if (!videosFormats.find(f => f.qualityLabel === qualityLabel)) {
            videosFormats.push({ 'quality': itag, qualityLabel });
        }
    });
    return { name, videosFormats };
};

const ytmixer = (link, videoOptions = {}) => {
    const result = new stream.PassThrough({ highWaterMark: videoOptions.highWaterMark || 1024 * 512 });
    ytdl.getInfo(link, videoOptions).then(info => {
        let audioStream = ytdl.downloadFromInfo(info, { quality: 'highestaudio' });
        let videoStream = ytdl.downloadFromInfo(info, videoOptions);
        // create the ffmpeg process for muxing
        let ffmpegProcess = cp.spawn(ffmpegPath, [
            // supress non-crucial messages
            '-loglevel', '8', '-hide_banner',
            // input audio and video by pipe
            '-i', 'pipe:3', '-i', 'pipe:4',
            // map audio and video correspondingly
            '-map', '0:a', '-map', '1:v',
            // no need to change the codec
            '-c', 'copy',
            // output mp4 and pipe
            '-f', 'matroska', 'pipe:5'
        ], {
            // no popup window for Windows users
            windowsHide: true,
            stdio: [
                // silence stdin/out, forward stderr,
                'inherit', 'inherit', 'inherit',
                // and pipe audio, video, output
                'pipe', 'pipe', 'pipe'
            ]
        });
        audioStream.pipe(ffmpegProcess.stdio[3]);
        videoStream.pipe(ffmpegProcess.stdio[4]);
        ffmpegProcess.stdio[5].pipe(result);
    });
    return result;
};

export default router;