const nodemailer = require('nodemailer');
const crypto = require('crypto');

/**
 * Create email transporter with optimized settings for production
 */
const createTransporter = () => {
  const port = parseInt(process.env.EMAIL_PORT) || 587;

  // Debug: Log the actual port being used
  console.log('📧 Email Config Debug:', {
    EMAIL_PORT_ENV: process.env.EMAIL_PORT,
    parsed_port: port,
    secure_setting: port === 465,
    host: process.env.EMAIL_HOST,
  });

  const config = {
    host: process.env.EMAIL_HOST,
    port: port,
    secure: port === 465, // true for 465, false for other ports like 587
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    // For production (serverless), these settings are better:
    pool: false, // Change back to false for serverless
    maxConnections: 1,
    maxMessages: 1,
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 30000, // Increased for production
    greetingTimeout: 15000,
    socketTimeout: 45000,
  };

  console.log('📧 Transporter config:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    pool: config.pool,
  });

  return nodemailer.createTransport(config);
};

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

/**
 * Send email with timeout and retry logic
 */
const sendEmail = async (options) => {
  const maxRetries = 3;
  let lastError;

  console.log(`📧 Attempting to send email to: ${options.to}`);
  console.log(`📧 Subject: ${options.subject}`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📧 Email attempt ${attempt}/${maxRetries}`);
      const emailTransporter = getTransporter();

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
      };

      console.log(`📧 Mail options:`, {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
      });

      const emailPromise = emailTransporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Email timeout after 30 seconds')), 30000)
      );

      const result = await Promise.race([emailPromise, timeoutPromise]);

      console.log(`✅ Email sent successfully!`);
      console.log(`📧 Message ID: ${result.messageId}`);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`❌ Email attempt ${attempt}/${maxRetries} failed:`, error.message);

      // More detailed error logging
      if (error.code) {
        console.error(`📧 Error code: ${error.code}`);
      }
      if (error.response) {
        console.error(`📧 SMTP response: ${error.response}`);
      }
      if (error.responseCode) {
        console.error(`📧 Response code: ${error.responseCode}`);
      }

      if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
        transporter = null;
      }

      if (attempt < maxRetries) {
        const delay = 2000 * attempt;
        console.log(`🔄 Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`💥 All ${maxRetries} email attempts failed. Final error:`, lastError.message);
  throw lastError;
};

/**
 * Generate verification token
 */
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Create verification URL
 */
const createVerificationUrl = (token) => {
  return `${process.env.USER_FRONTEND_URL}/auth/verify-email?token=${token}`;
};

/**
 * Create verification email HTML
 */
const createVerificationEmailHtml = (firstName, verificationUrl) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - Cozy Loops</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-bottom: 20px;">
            <!-- Header with Logo -->
            <div style="background: linear-gradient(135deg, #FF7043 0%, #FF5722 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <div style="background-color: rgba(255,255,255,0.1); display: inline-block; padding: 15px 25px; border-radius: 50px; margin-bottom: 20px;">
                  <svg width="117" height="41" viewBox="0 0 117 41" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M78.7851 34.9508L81.0776 36.2586C79.7416 38.5512 77.8725 39.7899 75.4702 39.9812C75.2538 40.0063 75.0468 40.022 74.8586 40.022C74.0401 40.022 73.2278 39.8903 72.4249 39.6331C71.619 39.3728 70.9102 39.0529 70.2986 38.6703C69.6839 38.2877 69.1978 37.88 68.8466 37.4441C68.6835 37.2528 68.4357 36.9517 68.1096 36.544C67.6737 35.945 67.3193 35.4934 67.0464 35.1923C66.7704 34.8912 66.4129 34.5369 65.9613 34.1292C65.5097 33.7215 65.055 33.4204 64.5877 33.2291C64.1235 33.0378 63.6217 32.9405 63.076 32.9405H54.646V0.173828H57.3086V30.3281H63.076C63.9228 30.3281 64.7037 30.4567 65.4313 30.717C66.1526 30.9773 66.83 31.3787 67.4541 31.9244C68.0814 32.4701 68.5643 32.9343 68.9062 33.3169C69.2449 33.6995 69.6902 34.2295 70.2359 34.9132C70.5087 35.2958 70.7283 35.5812 70.8914 35.7725C71.2457 36.2084 71.8448 36.5973 72.6915 36.9392C73.5383 37.2779 74.3819 37.4221 75.2287 37.3688C76.756 37.2308 77.9415 36.428 78.7882 34.954L78.7851 34.9508Z" fill="#FE8253"/>
                  <path d="M63.3394 27.1574C62.9725 26.6807 62.684 26.0535 62.4801 25.2757C62.2763 24.498 62.1446 23.7704 62.0912 23.0867C62.0348 22.4061 62.0097 21.5719 62.0097 20.5903V6.10746C62.0097 2.0963 63.8036 0.0922852 67.3882 0.0922852C70.9729 0.0922852 72.7668 2.0963 72.7668 6.10746V20.5903C72.7668 21.5719 72.7385 22.4061 72.6852 23.0867C72.6288 23.7704 72.5002 24.498 72.2963 25.2757C72.0925 26.0535 71.8008 26.6807 71.4182 27.1574C71.0356 27.6341 70.5056 28.0387 69.8219 28.3649C69.1382 28.691 68.3228 28.8572 67.3663 28.8572C66.4098 28.8572 65.5943 28.6942 64.9107 28.3649C64.227 28.0387 63.7032 27.6341 63.3332 27.1574H63.3394ZM64.6692 6.10746V20.5903C64.6692 21.6817 64.7162 22.5943 64.8134 23.3313C64.9107 24.0683 65.0236 24.6266 65.1616 25.0092C65.2964 25.3918 65.5128 25.6709 65.7951 25.8465C66.0836 26.0253 66.3219 26.1256 66.5132 26.1539C66.7014 26.1821 66.9962 26.1946 67.3914 26.1946C67.7865 26.1946 68.0813 26.1821 68.2726 26.1539C68.4608 26.1256 68.6992 26.0253 68.9877 25.8465C69.2762 25.6678 69.4801 25.3886 69.6024 25.0092C69.7247 24.6266 69.8376 24.0683 69.9505 23.3313C70.0603 22.5943 70.1136 21.6817 70.1136 20.5903V6.10746C70.1136 4.66169 69.9034 3.73965 69.4801 3.34449C69.0567 2.94934 68.3636 2.75176 67.3945 2.75176C66.4254 2.75176 65.7292 2.94934 65.309 3.34449C64.8856 3.73965 64.6755 4.66169 64.6755 6.10746H64.6692Z" fill="#FE8253"/>
                  <path d="M76.1444 27.1574C75.7775 26.6807 75.489 26.0535 75.2851 25.2757C75.0813 24.498 74.9496 23.7704 74.8962 23.0867C74.8398 22.4061 74.8147 21.5719 74.8147 20.5903V6.10746C74.8147 2.0963 76.6086 0.0922852 80.1932 0.0922852C83.7779 0.0922852 85.5718 2.0963 85.5718 6.10746V20.5903C85.5718 21.5719 85.5435 22.4061 85.4902 23.0867C85.4338 23.7704 85.3052 24.498 85.1013 25.2757C84.8975 26.0535 84.6058 26.6807 84.2232 27.1574C83.8406 27.6341 83.3106 28.0387 82.6269 28.3649C81.9432 28.691 81.1278 28.8572 80.1713 28.8572C79.2147 28.8572 78.3993 28.6942 77.7157 28.3649C77.032 28.0387 76.5082 27.6341 76.1382 27.1574H76.1444ZM77.4742 6.10746V20.5903C77.4742 21.6817 77.5212 22.5943 77.6184 23.3313C77.7157 24.0683 77.8286 24.6266 77.9665 25.0092C78.1014 25.3918 78.3178 25.6709 78.6001 25.8465C78.8886 26.0253 79.1269 26.1256 79.3182 26.1539C79.5064 26.1821 79.8012 26.1946 80.1964 26.1946C80.5915 26.1946 80.8863 26.1821 81.0776 26.1539C81.2658 26.1256 81.5041 26.0253 81.7927 25.8465C82.0812 25.6678 82.2851 25.3886 82.4074 25.0092C82.5297 24.6266 82.6426 24.0683 82.7555 23.3313C82.8652 22.5943 82.9186 21.6817 82.9186 20.5903V6.10746C82.9186 4.66169 82.7084 3.73965 82.2851 3.34449C81.8617 2.94934 81.1686 2.75176 80.1995 2.75176C79.2304 2.75176 78.5342 2.94934 78.1139 3.34449C77.6906 3.73965 77.4804 4.66169 77.4804 6.10746H77.4742Z" fill="#FE8253"/>
                  <path d="M87.6636 28.8543V0.0924582H89.8746C90.8563 0.0642327 91.6403 0.0642327 92.2268 0.0924582C92.8132 0.120684 93.544 0.255539 94.4158 0.50016C95.2877 0.744782 95.9839 1.11171 96.5014 1.60409C97.3199 2.42263 97.7276 3.51402 97.7276 4.87825V11.1788C97.7276 11.4517 97.7088 11.7402 97.668 12.0381C97.6272 12.3392 97.5363 12.6873 97.4015 13.0825C97.2666 13.4776 97.0533 13.8383 96.7679 14.1676C96.4825 14.4938 96.1344 14.8011 95.7267 15.0865C95.3159 15.375 94.7733 15.5977 94.0897 15.7639C93.406 15.927 92.6282 16.0085 91.7563 16.0085H90.3263V28.8543H87.6636ZM91.7532 13.3898C92.5467 13.3898 93.1864 13.3146 93.6757 13.164C94.1681 13.0135 94.5005 12.794 94.6761 12.5086C94.8549 12.22 94.9709 11.9974 95.0274 11.8311C95.0807 11.6681 95.1089 11.4485 95.1089 11.1757V4.87825C95.1089 4.25102 94.9458 3.79941 94.6165 3.52657C94.0457 2.95265 92.6125 2.68294 90.32 2.70802V13.3459C90.8374 13.3741 91.3141 13.3867 91.7501 13.3867L91.7532 13.3898Z" fill="#FE8253"/>
                  <path d="M104.872 28.1202C103.768 27.6027 102.818 26.8783 102.027 25.95C100.936 24.5042 100.475 22.8608 100.638 21.0199C100.801 19.179 101.441 17.7646 102.56 16.7829C103.297 16.1024 104.163 15.679 105.157 15.5159C106.154 15.3529 107.102 15.4752 108.002 15.8829C108.983 16.3188 109.745 17.0088 110.294 17.9496C110.84 18.8905 111.113 20.0038 111.113 21.2834H108.453C108.453 19.7278 107.948 18.7336 106.939 18.2977C106.503 18.1064 106.045 18.0531 105.568 18.1346C105.088 18.2162 104.674 18.4075 104.32 18.7086C103.749 19.2542 103.401 20.101 103.279 21.2457C103.156 22.3904 103.407 23.3877 104.034 24.2314C104.665 24.9966 105.421 25.5329 106.305 25.8465C107.193 26.1601 108.046 26.2824 108.864 26.2165C109.683 26.1507 110.46 25.9374 111.197 25.583C112.395 24.984 113.248 24.1153 113.753 22.9863C114.258 21.8541 114.359 20.5809 114.061 19.1602C113.898 18.3699 113.666 17.6799 113.365 17.0934C113.063 16.507 112.731 15.9958 112.364 15.5598C111.994 15.1239 111.436 14.6598 110.686 14.1674C109.937 13.675 109.209 13.2485 108.497 12.8784C107.788 12.5115 106.766 12.0128 105.427 11.3856C104.552 10.9497 103.802 10.4573 103.175 9.9116C102.548 9.3659 102.096 8.82021 101.827 8.27452C101.551 7.72882 101.359 7.23644 101.253 6.80052C101.143 6.36459 101.09 5.92866 101.09 5.49273C101.09 4.48289 101.35 3.52322 101.867 2.60746C102.385 1.69483 103.053 1.05819 103.871 0.7038C105.618 -0.114741 107.227 -0.196281 108.701 0.459178C109.984 1.0331 110.843 2.04294 111.279 3.48872C111.552 4.33549 111.605 5.11953 111.442 5.84085C111.279 6.56217 111.066 7.14236 110.809 7.57829C110.548 8.01421 110.241 8.3686 109.887 8.64145L108.249 6.55589C108.88 6.03843 109.043 5.2732 108.742 4.26335C108.525 3.5828 108.143 3.11865 107.597 2.87089C106.888 2.54473 106.016 2.61059 104.978 3.07474C104.677 3.2096 104.398 3.51067 104.141 3.97483C103.881 4.43898 103.752 4.9439 103.752 5.48646C103.752 6.93223 104.69 8.10516 106.575 9.00524C107.613 9.49762 108.369 9.85828 108.845 10.0904C109.322 10.3224 109.956 10.658 110.749 11.0908C111.539 11.5267 112.135 11.8968 112.53 12.1947C112.925 12.4958 113.39 12.891 113.92 13.3833C114.453 13.8757 114.86 14.3587 115.149 14.8354C115.438 15.3152 115.717 15.8672 115.986 16.4944C116.259 17.1217 116.479 17.8179 116.642 18.58C117.134 20.8161 116.933 22.7479 116.049 24.3693C115.162 25.9907 113.929 27.1856 112.348 27.9509C111.091 28.5781 109.783 28.8917 108.419 28.8917C107.164 28.8917 105.985 28.6314 104.881 28.1139L104.872 28.1202Z" fill="#FE8253"/>
                  <path d="M3.55777 26.8032C3.98115 27.2391 4.76519 27.4555 5.90676 27.4555C7.04833 27.4555 7.8355 27.2391 8.25889 26.8032C8.67913 26.3704 8.88926 25.5676 8.88926 24.3978H11.2759C11.2759 28.0514 9.48199 29.8798 5.88794 29.8798C2.29389 29.8798 0.5 28.0514 0.5 24.3978V11.1976C0.5 10.4512 0.531362 9.77381 0.594085 9.1654C0.656809 8.55698 0.797936 7.89211 1.0206 7.17079C1.24327 6.44947 1.54434 5.84733 1.91755 5.36436C2.29075 4.87825 2.81136 4.47682 3.4825 4.15066C4.15364 3.82763 4.95964 3.66455 5.90362 3.66455C6.67512 3.66455 7.35881 3.76491 7.95468 3.96249C8.55055 4.16007 9.04293 4.45487 9.42868 4.83748C9.81443 5.22009 10.1312 5.64661 10.3789 6.10449C10.6267 6.56551 10.818 7.09239 10.956 7.68826C11.0908 8.28413 11.1787 8.85491 11.2163 9.40374C11.2539 9.95257 11.2727 10.5484 11.2727 11.1945H8.88612C8.88612 10.3728 8.84849 9.66091 8.77636 9.04936C8.70109 8.44094 8.57878 7.95483 8.40315 7.59417C8.22753 7.23351 8.06444 6.94185 7.91704 6.71918C7.76964 6.49651 7.55638 6.3397 7.28354 6.25189C7.01069 6.16408 6.78802 6.11704 6.6124 6.10449C6.43677 6.09195 6.20156 6.08568 5.90362 6.08568C5.4332 6.08568 5.04745 6.12958 4.74951 6.21739C4.45158 6.30521 4.14737 6.50906 3.83689 6.83208C3.52327 7.15511 3.29433 7.67571 3.14693 8.39703C2.99639 9.11835 2.92426 10.0498 2.92426 11.1914V24.3915C2.92426 25.5582 3.13438 26.361 3.55463 26.7969L3.55777 26.8032Z" fill="#FBBF56"/>
                  <path d="M14.3525 28.3305C14.0169 27.8946 13.7566 27.3238 13.5684 26.6151C13.3803 25.9063 13.2642 25.2414 13.2172 24.6204C13.167 23.9995 13.1419 23.2405 13.1419 22.3467V9.14658C13.1419 5.49294 14.7759 3.66455 18.0469 3.66455C21.3179 3.66455 22.9487 5.4898 22.9487 9.14658V22.3467C22.9487 23.2405 22.9236 23.9995 22.8734 24.6204C22.8264 25.2414 22.7072 25.9063 22.5222 26.6151C22.3372 27.3238 22.0706 27.8946 21.7193 28.3305C21.3712 28.7633 20.8851 29.1334 20.2673 29.4313C19.6463 29.7293 18.8999 29.8767 18.0281 29.8767C17.1562 29.8767 16.4129 29.7293 15.792 29.4313C15.171 29.1334 14.6912 28.7665 14.3556 28.3305H14.3525ZM15.5662 9.14658V22.3467C15.5662 23.3409 15.6101 24.172 15.6979 24.8431C15.7826 25.5143 15.8892 26.0223 16.0115 26.3736C16.1369 26.7217 16.3283 26.9757 16.5917 27.1388C16.852 27.3019 17.0715 27.3928 17.244 27.4179C17.4165 27.443 17.6831 27.4555 18.0469 27.4555C18.4107 27.4555 18.6741 27.443 18.8466 27.4179C19.0191 27.3928 19.2355 27.3019 19.4989 27.1388C19.7592 26.9788 19.9474 26.7217 20.0572 26.3736C20.1701 26.0254 20.2767 25.5143 20.3739 24.8431C20.4743 24.172 20.5213 23.3409 20.5213 22.3467V9.14658C20.5213 7.82939 20.33 6.98889 19.9443 6.63137C19.5585 6.27071 18.925 6.08881 18.0437 6.08881C17.1625 6.08881 16.5258 6.27071 16.1401 6.63137C15.7543 6.99203 15.563 7.83252 15.563 9.14658H15.5662Z" fill="#FBBF56"/>
                  <path d="M32.1565 18.765L28.4621 27.5275H38.3441V29.9517H24.8461L29.9925 17.7238C29.4939 17.4008 29.0548 17.0464 28.6691 16.6606C28.2833 16.2749 27.9854 15.9268 27.7721 15.6163C27.5589 15.3058 27.3832 14.9828 27.2327 14.6472C27.0822 14.3116 26.9881 14.0827 26.9536 13.9573C26.9159 13.8318 26.8971 13.722 26.8971 13.6217L28.0512 13.399L29.2461 13.1764C29.4437 13.9729 30.0176 14.7288 30.9616 15.4501L34.8755 6.09174H26.3734V3.66748H38.5292L33.0848 16.5321C34.3048 16.9303 35.7192 17.1279 37.3343 17.1279V19.5522C35.3711 19.5522 33.643 19.2919 32.1533 18.7681L32.1565 18.765Z" fill="#FBBF56"/>
                  <path d="M49.3428 3.66748H51.767V7.69432C51.767 11.994 50.2617 15.2995 47.2541 17.6109V29.8765H44.8298V17.6109C41.8473 15.2995 40.3545 11.994 40.3545 7.69432V3.66748H42.7788V7.69432C42.7788 11.05 43.8701 13.6374 46.0592 15.4501C48.2482 13.6374 49.3396 11.05 49.3396 7.69432V3.66748H49.3428Z" fill="#FBBF56"/>
                  </svg>

                </div>
                <h2 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 400; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                    Welcome to Our Community!
                </h2>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 40px 30px;">
                <h3 style="color: #2c3e50; font-size: 22px; font-weight: 600; margin-bottom: 20px; text-align: center;">
                    Hello ${firstName}! 👋
                </h3>
                
                <p style="color: #5a6c7d; font-size: 16px; line-height: 1.6; margin-bottom: 25px; text-align: center;">
                    Thank you for joining <strong style="color: #FF7043;">Cozy Loops</strong>! We're excited to have you as part of our community. 
                    To get started, please verify your email address by clicking the button below.
                </p>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 40px 0;">
                    <a href="${verificationUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #FF7043 0%, #FF5722 100%); 
                              color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 50px; 
                              font-weight: 600; font-size: 16px; letter-spacing: 0.5px; 
                              box-shadow: 0 4px 15px rgba(255, 112, 67, 0.4); 
                              transition: all 0.3s ease; text-transform: uppercase;">
                        ✨ Verify My Email ✨
                    </a>
                </div>
                
                <!-- Important Info -->
                <div style="background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #ffcc02;">
                    <p style="color: #e65100; font-size: 14px; margin: 0; text-align: center; font-weight: 500;">
                        ⏰ <strong>Important:</strong> This verification link will expire in <strong>24 hours</strong>
                    </p>
                </div>
                
                <!-- Security Notice -->
                <div style="background-color: #f1f3f4; padding: 20px; border-radius: 8px; margin-top: 30px;">
                    <p style="color: #5f6368; font-size: 13px; margin: 0; text-align: center; line-height: 1.5;">
                        🔒 <strong>Security Notice:</strong> If you didn't create an account with Cozy Loops, 
                        please ignore this email. Your security is important to us.
                    </p>
                </div>

                            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
                <p style="color: #6c757d; font-size: 14px; margin: 0 0 15px 0;">
                    Best regards,<br>
                    <strong style="color: #FF7043;">The Cozy Loops Team</strong>
                </p>
                
                <!-- Social Media Links -->
                <div style="margin-top: 20px;">
                    <a href="https://twitter.com/cozyloops" style="display: inline-block; margin: 0 10px; color: #FF7043; text-decoration: none;">
                        <span style="font-size: 20px;">🐦</span>
                    </a>
                    <a href="https://www.linkedin.com/company/cozy-loops/" style="display: inline-block; margin: 0 10px; color: #FF7043; text-decoration: none;">
                        <span style="font-size: 20px;">💼</span>
                    </a>
                </div>
                
                <p style="color: #adb5bd; font-size: 12px; margin: 15px 0 0 0; line-height: 1.4;">
                    © 2024 Cozy Loops. All rights reserved.<br>
                    This email was sent to you as part of your account security.
                </p>
            </div>
            </div>
        </div>
        
        <!-- Mobile Responsive Styles -->
        <style>
            @media only screen and (max-width: 600px) {
                .email-container {
                    margin: 10px !important;
                }
                .header-padding {
                    padding: 30px 15px !important;
                }
                .content-padding {
                    padding: 30px 20px !important;
                }
                .button-text {
                    font-size: 14px !important;
                    padding: 14px 30px !important;
                }
            }
        </style>
    </body>
    </html>
  `;
};

module.exports = {
  sendEmail,
  generateVerificationToken,
  createVerificationUrl,
  createVerificationEmailHtml,
};
