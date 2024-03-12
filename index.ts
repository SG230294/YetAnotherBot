import {Telegraf} from 'telegraf'
import * as dotenv from 'dotenv'
import {message} from "telegraf/filters";
import * as fs from "node:fs";
import axios from "axios";
//import imageDataURI from "image-data-uri";
import * as imageDataURI from "image-data-uri";

//import template from "-!svg-react-loader!./template.svg"


dotenv.config();
const tgToken = process.env.BOT_TOKEN as string
const bot = new Telegraf(tgToken)

bot.on(message('photo'), (ctx) => modifyPicture(ctx));

async function modifyPicture(ctx: any) {

  let imageId = ctx.message.photo.pop().file_id;

  ctx.telegram.getFileLink(imageId).then((link: string) => {
    axios({url: link, responseType: 'stream'}).then(response => {
      return new Promise(() => {
        response.data.pipe(fs.createWriteStream(`./${imageId}.jpg`))
            .on('finish', () => console.log('file saved'))
      });
    })
  })

}



// example data uri
imageDataURI.encodeFromURL('https://2ch.hk/b/thumb/266160769/16492546145510s.jpg').then(dataURI => console.log(dataURI))

bot.launch();
console.log('Done!');

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))