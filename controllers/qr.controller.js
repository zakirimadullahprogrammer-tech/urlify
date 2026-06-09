const QRCode = require("qrcode");

async function generateQR(req, res) {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        message: "URL required"
      });
    }

    const qrBuffer = await QRCode.toBuffer(url, {
      width: 400,
      margin: 2
    });

    res.setHeader("Content-Type", "image/png");

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=qrcode.png"
    );

    return res.send(qrBuffer);

  } catch (error) {
    console.error("QR Generate Error:", error);

    return res.status(500).json({
      message: "Failed to generate QR"
    });
  }
}

module.exports = {
  generateQR
};