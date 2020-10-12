const puppeteer = require('puppeteer');
const path = require("path");
const { WSAEPROVIDERFAILEDINIT } = require('constants');
const MongoClient = require('mongodb').MongoClient;

const phone_ids = [
    // Add phone number IDs with "@c.us" suffix, ex. "9721234567@c.us"
];

const loadDB = async () => {
    const client = await MongoClient.connect('mongodb://localhost:27017/stalkbot');
    const db = client.db('stalkbot');
    return db;
};

(async () => {
    // Launch browser
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: path.join(process.cwd(), "ChromeSession")
    });
    const page = await browser.newPage();

    // Go to WhatsApp Web
    await page.goto('https://web.whatsapp.com', {
        waitUntil: 'networkidle0',
        timeout: 0
    });

    // Wait until login using QR Code
    await page.waitForSelector('*[data-icon=chat]',
        {
            polling: 1000,
            timeout: 0
        })
    console.log("Logged in!")

    // Inject API file
    let filepath = path.join(__dirname, "WAPI.js");
    await page.addScriptTag({ path: require.resolve(filepath) });


    const db = await loadDB();
    const activityCollection = db.collection("activity");

    setInterval(async () => {
        phone_ids.map(async (phoneId) => {
            const isOnline = await page.evaluate(async (userID) => {
                return await window.WAPI.isUserOnline(userID);
            }, phoneId);

            if (isOnline)
            {
                console.log(`${phoneId} is online!`);
            }

            activityCollection.insertOne(
                {
                    id: phoneId,
                    isOnline: isOnline,
                    timestamp: new Date()
                }
            );
            return isOnline;
        })
    },
        20000);

})();