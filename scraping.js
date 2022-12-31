const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = "mongodb+srv://nitishGuptaDeveloper:<password>@cluster0.9s4hhmu.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function insertData(doc) {
    try {
        const database = client.db("amazon-product");
        const productData = database.collection("product-data");
        console.log(doc)
        const result = await productData.insertOne(doc);
        console.log(result);
    } finally {
        await client.close();
    }
}



const url = 'https://www.amazon.com/s?srs=5286335011';
let productAlreadyScrapped = 0
alreadyScrappedProducts = {};
let totalProduct
let pageIndex = 1;

// ----------using cheerio -------------------
async function scrappingData(url) {
    try {

        do {
            // console.log(pageIndex)
            const data = await getCurrentPageData(pageIndex);
            if (pageIndex === 1) {
                totalProduct = getTotalProduct(data)
            }
            const currentPageProducts = getProducts(data);
            const productIds = Object.keys(currentPageProducts);
            // console.log(productIds.length);
            if (productIds.length) {
                productAlreadyScrapped += productIds.length;
                // console.log("productAlreadyScrapped", productAlreadyScrapped);
                // console.log("totalProduct", totalProduct)
                alreadyScrappedProducts = Object.assign(currentPageProducts, alreadyScrappedProducts);
            }
            pageIndex++;
        } while (productAlreadyScrapped < totalProduct);
        // console.log(alreadyScrappedProducts);
        insertData(alreadyScrappedProducts).catch(console.dir);
    } catch (error) {
        console.log("Error: ", error);
    }
}

async function getCurrentPageData(pageIndex) {
    const { data } = await axios.get(url + '&page=' + pageIndex + '&ref=sr_pg_' + pageIndex, {
        headers: {
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            Host: 'www.amazon.com',
            'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:108.0) Gecko/20100101 Firefox/108.0',
            TE: 'trailers',
        }
    });

    return data
}

function getTotalProduct(body) {
    const dom = cheerio.load(body.replace(/\s\s+/g, '').replace(/\n/g, ''));
    const productList = dom('div[data-index]');
    return productList.length;
}
function getProducts(body) {
    const dom = cheerio.load(body.replace(/\s\s+/g, '').replace(/\n/g, ''));
    const productList = dom('div[data-index]');
    const scrapingResult = {};
    console.log(productList.length)
    for (let i = 0; i < productList.length; i++) {
        if (productList[i].attribs['data-asin']) {
            scrapingResult[productList[i].attribs['data-asin']] = {
                'amazon-id': productList[i].attribs['data-asin'],
                'title': "",
                'thumbnail': "",
                'price': "",
            };
        }

    }
    // console.log(scrapingResult)
    for (let key in scrapingResult) {
        try {
            const priceSearch = dom(`div[data-asin=${key}] span[data-a-size="l"]`)[0] || dom(`div[data-asin=${key}] span[data-a-size="m"]`)[0];

            const titleThumbnailSearch = dom(`div[data-asin=${key}] [data-image-source-density="1"]`)[0];

            if (priceSearch) {
                scrapingResult[key].price = dom(priceSearch.children[0]).text().replace(/[^D+0-9.,]/g, '');
            }

            if (titleThumbnailSearch) {
                scrapingResult[key].title = titleThumbnailSearch.attribs.alt;
                scrapingResult[key].thumbnail = titleThumbnailSearch.attribs.src;
            }
        } catch (err) {
            console.error(err);
        }
    }

    return scrapingResult;
}
scrappingData(url);


