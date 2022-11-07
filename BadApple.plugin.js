/**
 * @name BadApple
 * @author arg0NNY
 * @authorLink https://github.com/arg0NNY
 * @version 1.0.0
 * @description F7 - Play/Pause
 */

const fs = require('fs');
const path = require('path');

module.exports = (() => {
    const {
        DOM,
        Webpack,
        Plugins,
        Patcher
    } = BdApi;

    function getMangled(filter) {
        const target = Webpack.getModule(m => Object.values(m).some(filter));
        return target ? [
            target,
            Object.keys(target).find(k => filter(target[k]))
        ] : [];
    }

    const NAME = 'BadApple';
    const STYLE_ID = 'bad-apple-style';
    const VIDEO_FILE = './badapple.webm';
    const VIDEO_WIDTH = 962;
    const VIDEO_HEIGHT = 720;

    const MediaInfo = Webpack.getModule(m => m.getOutputVolume);
    const RadioForm = getMangled(m => m?.toString?.().includes('itemTitleClassName'));

    return class BadApple {

        start() {
            this.addStyle();
            this.listenHotkey();
            // this.justVisualSettingPatch();
        }

        justVisualSettingPatch() {
            Patcher.before(NAME, ...RadioForm, (_, [args]) => {
                if (args?.options?.[2]?.name === 'Sync with computer') args.options[2].name = 'Bad Apple!!';
            });
        }

        async startVideo() {
            this.canStop = false;
            await this.takeScreenshots();
            this.initializeCanvas();
            this.playVideo();
            this.canStop = true;
        }

        listenHotkey() {
            this.hotkeyHandler = e => {
                if (e.key !== 'F7') return;

                if (this.video && this.canStop) this.stopVideo();
                else this.startVideo();
            };
            document.addEventListener('keydown', this.hotkeyHandler);
        }
        unlistenHotkey() {
            document.removeEventListener('keydown', this.hotkeyHandler);
        }

        addStyle() {
            DOM.addStyle(STYLE_ID, `
.bad-apple-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9999999999999999999999999999999999999;
}

.bad-apple-video {
    position: fixed;
    top: -99999px;
    left: -99999px;
    visibility: hidden;
    pointer-events: none;
}
            `);
        }
        removeStyle() {
            DOM.removeStyle(STYLE_ID);
        }

        async getScreenshot() {
            const img = new Image();
            img.src = (await MediaInfo.getMediaEngine().getWindowPreviews(screen.width, screen.height)).find(w => w.name.includes('Discord')).url;
            return img;
        }

        async takeScreenshots() {
            const { classList } = document.documentElement;

            const get = (...classes) => new Promise(r => {
                classList.replace(...classes);
                requestAnimationFrame(async () => {
                    await new Promise(r => setTimeout(r, 500));
                    r(await this.getScreenshot())
                });
            });
            const dark = () => get('theme-light', 'theme-dark');
            const light = () => get('theme-dark', 'theme-light');

            const isThemeDark = classList.contains('theme-dark');
            if (isThemeDark) {
                this.imageDark = await dark();
                this.imageLight = await light();
            }
            else {
                this.imageLight = await light();
                this.imageDark = await dark();
            }

            if (isThemeDark) classList.replace('theme-light', 'theme-dark');
            else classList.replace('theme-dark', 'theme-light');
        }

        initializeCanvas() {
            this.canvas = document.createElement('canvas');
            this.canvas.className = 'bad-apple-canvas';

            this.onResize = () => {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
            }
            window.addEventListener('resize', this.onResize);
            this.onResize();

            this.ctx = this.canvas.getContext('2d');
            document.body.appendChild(this.canvas);
        }

        playVideo() {
            this.video = document.createElement('video');
            this.video.src = 'data:video/webm;base64,' + fs.readFileSync(path.join(Plugins.folder, VIDEO_FILE), 'base64');
            this.video.className = 'bad-apple-video';
            this.video.volume = .4;

            this.video.onplay = () => this.render();
            setTimeout(() => this.video.play());
        }

        drawImageProp(ctx, img, x, y, w, h, offsetX, offsetY) {

            if (arguments.length === 2) {
                x = y = 0;
                w = ctx.canvas.width;
                h = ctx.canvas.height;
            }

            // default offset is center
            offsetX = typeof offsetX === "number" ? offsetX : 0.5;
            offsetY = typeof offsetY === "number" ? offsetY : 0.5;

            // keep bounds [0.0, 1.0]
            if (offsetX < 0) offsetX = 0;
            if (offsetY < 0) offsetY = 0;
            if (offsetX > 1) offsetX = 1;
            if (offsetY > 1) offsetY = 1;

            var iw = VIDEO_WIDTH,
                ih = VIDEO_HEIGHT,
                r = Math.min(w / iw, h / ih),
                nw = iw * r,   // new prop. width
                nh = ih * r,   // new prop. height
                cx, cy, cw, ch, ar = 1;

            // decide which gap to fill
            if (nw < w) ar = w / nw;
            if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh;  // updated
            nw *= ar;
            nh *= ar;

            // calc source rectangle
            cw = iw / (nw / w);
            ch = ih / (nh / h);

            cx = (iw - cw) * offsetX;
            cy = (ih - ch) * offsetY;

            // make sure source rectangle is valid
            if (cx < 0) cx = 0;
            if (cy < 0) cy = 0;
            if (cw > iw) cw = iw;
            if (ch > ih) ch = ih;

            // fill image in dest. rectangle
            ctx.drawImage(img, cx, cy, cw, ch,  x, y, w, h);
        }

        render() {
            if (this.video === null || this.video?.paused || this.video?.ended) return this.stopVideo();

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.drawImageProp(this.ctx, this.video, -5, -5, this.canvas.width + 10, this.canvas.height + 10);
            this.ctx.globalCompositeOperation = 'source-in';
            this.ctx.drawImage(this.imageLight, 0, 0);
            this.ctx.globalCompositeOperation = 'destination-over';
            this.ctx.drawImage(this.imageDark, 0, 0);
            this.ctx.globalCompositeOperation = 'source-over';

            requestAnimationFrame(() => this.render());
        }

        stopVideo() {
            this.imageLight = null;
            this.imageDark = null;
            this.video?.pause();
            this.video?.remove();
            this.video = null;

            window.removeEventListener('resize', this.onResize);
            this.canvas?.remove();
        }
        stop() {
            this.unlistenHotkey();
            this.stopVideo();
            this.removeStyle();
            Patcher.unpatchAll(NAME);
        }

    }
})();
