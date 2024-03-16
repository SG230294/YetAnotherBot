import {Input, Telegraf} from 'telegraf'
import * as dotenv from 'dotenv'
import {message} from "telegraf/filters";
import * as fsAsync from "fs/promises";
import * as fs from "fs";
import axios from "axios";
import * as imageDataURI from "image-data-uri";
import * as cheerio from "cheerio";
import * as convertSvgToPng from 'convert-svg-to-png';
import * as sharp from 'sharp';

//import template from "-!svg-react-loader!./template.svg"
async function main() {

  const url = 'https://2ch.hk/b/thumb/266160769/16492546145510s.jpg';

  const response = await axios.get(url,{ responseType: 'arraybuffer' })
  const buffer = Buffer.from(response.data, "utf-8")

  const image = sharp(buffer);
  const metadata = await image.metadata();
  console.log('Width:', metadata.width);
  console.log('Height:', metadata.height);


}


dotenv.config();
const tgToken = process.env.BOT_TOKEN as string
const bot = new Telegraf(tgToken)

bot.on(message('photo'), (ctx) => modifyPicture(ctx));

async function modifyPicture(ctx: any) {

  let imageId = ctx.message.photo.pop().file_id;
  const url = await ctx.telegram.getFileLink(imageId);

  const response = await axios.get(url,{ responseType: 'arraybuffer' })
  const buffer = Buffer.from(response.data, "utf-8")
  const dataURI = await imageDataURI.encode(buffer, 'PNG');

  const metadata = await sharp(buffer).metadata();
  const imgWidth = metadata.width;
  const imgHeight = metadata.height;


  //const dataURI = await imageDataURI.encodeFromURL(url);
  const svgFile = await fsAsync.readFile('./template.svg',"utf-8");
  const svg = cheerio.load(svgFile, {xmlMode: true});
  svg('svg.SVG_0').attr('width', imgWidth.toString());
  svg('svg.SVG_0').attr('height', imgHeight.toString());
  svg('svg.SVG_0').attr('viewBox', `0 0 ${imgWidth} ${imgHeight}`);

  svg('g.WEIGHT').attr('transform', `matrix(0.5 0 0 0.5 100 ${imgHeight - 100})`);

  svg('image.SVGID_2').prop('href', dataURI);
  svg('image.SVGID_2').attr('width', imgWidth.toString());
  svg('image.SVGID_2').attr('height', imgHeight.toString());

  svg('tspan.CAPTION').text(ctx.update.message.caption)
  // Debug +
  await fsAsync.writeFile("./result.svg", svg.xml());
  // Debug -
  const png = await convertSvgToPng.convert(svg.xml());
  const photo = Buffer.from(png);
  ctx.replyWithPhoto(Input.fromBuffer(photo));


}

//main();
bot.launch();
console.log('Done!');

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))