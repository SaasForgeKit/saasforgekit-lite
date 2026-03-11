<?php

return [
    'providers' => [
        'google' => [
            'label' => 'Google',
            'driver' => 'google',
            'required_config' => [
                'services.google.client_id',
                'services.google.client_secret',
                'services.google.redirect',
            ],
        ],
        'github' => [
            'label' => 'GitHub',
            'driver' => 'github',
            'required_config' => [
                'services.github.client_id',
                'services.github.client_secret',
                'services.github.redirect',
            ],
        ],
    ],
];
