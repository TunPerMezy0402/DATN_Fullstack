<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
    ],

    'vnpay' => [
    'tmn_code'     => env('VNPAY_TMN_CODE', 'P9JR80A2'),
    'hash_secret'  => env('VNPAY_HASH_SECRET'),
    'url'          => env('VNPAY_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
    'return_url'   => env('VNPAY_RETURN_URL', 'http://localhost:3000/payment/success'),
    'ipn_url'      => env('VNPAY_IPN_URL', 'http://127.0.0.1:8000/api/vnpay/ipn'),

    // Tuỳ chọn thêm (ổn)
    'api_url'      => env('VNPAY_API_URL', 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction'),
    'version'      => '2.1.0',
    'command'      => 'pay',
    'curr_code'    => 'VND',
    'locale'       => 'vn',
    'order_type'   => 'other',

    // Giới hạn số tiền
    'timeout'      => 15, // minutes
    'min_amount'   => 10000, // 10,000 VND
    'max_amount'   => 500000000, // 500,000,000 VND
],



];
