import {Input, Telegraf} from 'telegraf'
import * as dotenv from 'dotenv'
import {message} from "telegraf/filters";
import * as fsAsync from "fs/promises";
import axios from "axios";
import * as imageDataURI from "image-data-uri";
import * as cheerio from "cheerio";
import * as sharp from 'sharp';
import { parse } from 'csv-parse';
import * as AdmZip from 'adm-zip'

dotenv.config();
const tgToken = process.env.BOT_TOKEN as string
const bot = new Telegraf(tgToken)

bot.on(message('photo'), (ctx) => modifyPicture(ctx));
bot.on(message('document'),(ctx) => processFile(ctx));

async function parseFile(csvText: string) {
  const parser = parse(csvText);
  const records = [];
  for await (const record of parser) {
    records.push(record);
  }
   return records;
}

async function processFile(ctx: any) {

  if(ctx.update.message.document.mime_type !== 'text/csv') {
    ctx.reply('File must be [ .CSV | .PNG | .JPG ]');
    return
  }
  const standByText: string = 'Please stand by';
  const standByMessage = await ctx.reply(standByText);
  try {
    const fileId = ctx.update.message.document.file_id;
    const url = await ctx.telegram.getFileLink(fileId);
    const response= await axios({url, responseType: 'text'})
    const csvText = response.data;
    let zip = new AdmZip();
    const records = await parseFile(csvText);
    let n = 0;
    for (const img of records) {
      const photo = await addOverlay(`${img[0]} KG`, img[1]);
      zip.addFile(`${++n}.png`, photo, ''); //TODO проверять размер выходного архива, он должен быть меньше 2ГБ
      ctx.telegram.editMessageText(ctx.chat.id, standByMessage.message_id, 0, `${standByText} [ ${n} / ${records.length} ]`);
    }
    // debug +
    // zip.writeZip("files.zip");
    // debug -
    let archive = zip.toBuffer();
    await ctx.replyWithDocument({source: archive, filename: 'photos.zip'});
  }
  catch (err) { ctx.reply(`Error during processing CSV \n${err}`); }

}

async function addOverlay(text: string, url: string){

  const response = await axios.get(url,{ responseType: 'arraybuffer' })
  let buffer = Buffer.from(response.data)
  const metadata = await sharp(buffer).metadata();
  let format = metadata.format;
  if (format == 'webp') {
    buffer = await sharp(buffer).png().toBuffer();
    format = 'png'
  }
  const dataURI = await imageDataURI.encode(buffer, format)
  const imgWidth = metadata.width;
  const imgHeight = metadata.height;

  const svgFile = await fsAsync.readFile('./template.svg',"utf-8");
  const svg = cheerio.load(svgFile, {xmlMode: true});
  svg('svg.SVG_0').attr('width', imgWidth.toString());
  svg('svg.SVG_0').attr('height', imgHeight.toString());
  svg('svg.SVG_0').attr('viewBox', `0 0 ${imgWidth} ${imgHeight}`);
  svg('g.WEIGHT').attr('transform', `matrix(0.5 0 0 0.5 100 ${imgHeight - 100})`);
  svg('image.SVGID_2').prop('xlink:href', dataURI);
  svg('image.SVGID_2').attr('width', imgWidth.toString());
  svg('image.SVGID_2').attr('height', imgHeight.toString());
  svg('tspan.CAPTION').text(text);

  // Debug +
  // await fsAsync.writeFile("./result.svg", ( svg.xml()));
  // await fsAsync.writeFile("./result.png", await sharp(Buffer.from(svg.xml())).png().toBuffer());
  // Debug -

  return sharp(Buffer.from(svg.xml())).png().toBuffer();

}

async function modifyPicture(ctx: any) {

  let imageId = ctx.message.photo.pop().file_id;
  const url = await ctx.telegram.getFileLink(imageId);
  const photo = await addOverlay(ctx.update.message.caption, url);
  await ctx.replyWithPhoto(Input.fromBuffer(photo));

}

bot.launch();
console.log('Bot started!');

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))