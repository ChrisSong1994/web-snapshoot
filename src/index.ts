/**
 * 负责将渲染出的页面快照到本地存储，控制快照和真实内容的替换时机
 */

type TSnapshotOptions = {
  id: string;
  expired?: number;
  ignoreUselessTag?: boolean;
  isImageToBase64?: boolean;
};

const LOG_PREFIX = "[H5_SNAPSHOT]";

// 创建挂载节点
function createSnapshotEle() {
  const snapshotEle = document.createElement("snap-shot");
  snapshotEle.id = "__H5_SNAPSHOT_ELEMENT_";

  snapshotEle.style.display = "block";
  snapshotEle.style.width = "100vw";
  snapshotEle.style.height = "100vh";
  // @ts-ignore
  snapshotEle.style["z-index"] = "9999999999";
  snapshotEle.style.position = "fixed";
  snapshotEle.style.left = "0px";
  snapshotEle.style.top = "0px";
  snapshotEle.style.display = "none";
  snapshotEle.style.backgroundColor = "#ffffff";
  return snapshotEle;
}

// 获取 base64 图片
function getBase64Image(img: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(img, 0, 0, img.width, img.height);
  const src = img.src || "";
  const ext = src.substring(src.lastIndexOf(".") + 1).toLocaleLowerCase();
  return canvas.toDataURL(`image/${ext}`);
}

/**
 * 1、初始化从本地存储中读取快照
 * 2、初始化快照显示和真实节点隐藏
 * 3、没有初始化快照则不做动作
 */
export default class Snapshot {
  // 快照元素
  snapshotEle: HTMLElement = createSnapshotEle();
  // 快照参数
  snapshotOptions: TSnapshotOptions = {
    id: "", // 快照存储ID,
    expired: 86400000, // 快照过期时间,默认一天
  };
  constructor(options: TSnapshotOptions) {
    this.init(options);
  }

  init(options: TSnapshotOptions) {
    if (options && options.id) {
      this.snapshotOptions.id = `${this.snapshotEle.id}_${options.id}`;
      this.snapshotOptions.expired = options.expired || 86400000;
      this.snapshotOptions.ignoreUselessTag = options.ignoreUselessTag;
      this.snapshotOptions.isImageToBase64 = options.isImageToBase64;
      if (localStorage.getItem(this.snapshotOptions.id)) {
        this.show();
      }
    } else {
      console.error(LOG_PREFIX, "未初始化快照参数");
    }
  }

  private removeTag(html: string) {
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<vconsole\-wrapper[\s\S]*?>[\s\S]*?<\/vconsole\-wrapper>/gi, "")
      .replace(/<snap\-shot[\s\S]*?>[\s\S]*?<\/snap\-shot>/gi, "");
  }

  private imageToBase64(html: string) {
    const images = document.getElementsByTagName("img");
    const allPromise: Array<Promise<any>> = [];
    const imgLoad = (img: HTMLImageElement) =>
      new Promise((resolve) => {
        img.onload = () => {
          const base64Data = getBase64Image(img);
          resolve({ src: img.src, data: base64Data });
        };
      });
    Array.from(images).forEach((img) => {
      const src = img.src;
      const isIgnoreImage = img.getAttribute("data-ignore-base64") !== null;
      if (isIgnoreImage) return;
      if (src) {
        img.crossOrigin = "Anonymous";
        if (img.complete) {
          const base64Data = getBase64Image(img);
          allPromise.push(Promise.resolve({ src, data: base64Data }));
        } else {
          allPromise.push(imgLoad(img));
        }
      }
    });
    return Promise.all(allPromise).then((arr) => {
      let newHtml = html;
      arr.forEach(({ src, data }) => {
        newHtml = newHtml.replace(src, data);
        newHtml = newHtml.replace(src.replace(/^https?\:/, ""), data);
      });
      return newHtml;
    });
  }

  private saveSnapShot(html: string) {
    localStorage.setItem(
      this.snapshotOptions.id,
      JSON.stringify({
        htmlSnapshot: html,
        expired: (this.snapshotOptions.expired as number) + Date.now(),
      }),
    );
  }

  /**
   * 更新快照
   */
  update() {
    if (this.snapshotOptions.id) {
      let htmlSnapshot = document.documentElement.outerHTML;
      if (this.snapshotOptions.ignoreUselessTag) {
        htmlSnapshot = this.removeTag(htmlSnapshot);
      }
      if (this.snapshotOptions.isImageToBase64) {
        this.imageToBase64(htmlSnapshot)
          .then((html) => this.saveSnapShot(html))
          .catch((err) => {
            throw err;
          });
      } else {
        this.saveSnapShot(htmlSnapshot);
      }
    } else {
      console.error(LOG_PREFIX, "未初始化快照参数");
    }
  }

  /**
   * 显示快照隐藏真实内容
   */
  show() {
    if (this.snapshotOptions.id) {
      const shadow = this.snapshotEle.attachShadow({ mode: "closed" });
      const html = document.createElement("html");
      const storeContent = localStorage.getItem(this.snapshotOptions.id) || "";
      try {
        if (storeContent) {
          const { expired, htmlSnapshot } = JSON.parse(storeContent);
          if (expired && expired < Date.now()) {
            localStorage.removeItem(this.snapshotOptions.id);
            console.warn(LOG_PREFIX, "快照已过期");
            return;
          }
          html.innerHTML = htmlSnapshot;
          shadow.appendChild(html);
          this.snapshotEle.style.display = "block";
          document.body.appendChild(this.snapshotEle);
        }
      } catch (e) {
        console.error(LOG_PREFIX, "快照存储解析报错");
      }
    } else {
      console.error(LOG_PREFIX, "未初始化快照参数");
    }
  }

  /**
   * 隐藏快照
   */
  hidden() {
    if (this.snapshotOptions.id) {
      this.snapshotEle.style.display = "none";
    } else {
      console.error(LOG_PREFIX, "未初始化快照参数");
    }
  }
}
