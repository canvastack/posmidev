<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Barcode Labels</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            font-size: 10pt;
        }

        .page {
            width: 100%;
            padding: 5mm;
        }

        .labels-container {
            display: grid;
            grid-template-columns: repeat({{ $layout['columns'] }}, 1fr);
            gap: {{ $layout['gap'] }};
            width: 100%;
        }

        .label {
            width: {{ $layout['label_width'] }};
            height: {{ $layout['label_height'] }};
            border: 1px solid #ddd;
            padding: 4mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            page-break-inside: avoid;
            overflow: hidden;
        }

        .label-product-name {
            font-size: 9pt;
            font-weight: bold;
            margin-bottom: 2mm;
            max-height: 12mm;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.2;
        }

        .label-barcode {
            margin: 2mm 0;
            max-width: 100%;
            max-height: 15mm;
        }

        .label-barcode img {
            max-width: 100%;
            height: auto;
            display: block;
        }

        .label-sku {
            font-size: 8pt;
            color: #666;
            margin-top: 1mm;
            font-family: 'Courier New', monospace;
        }

        .label-price {
            font-size: 11pt;
            font-weight: bold;
            margin-top: 1mm;
            color: #000;
        }

        /* Layout-specific adjustments */
        @media print {
            .page {
                page-break-after: always;
            }
            
            .label {
                page-break-inside: avoid;
            }
        }

        /* 4x6 Grid (Small labels) */
        @if($layout['columns'] == 4)
        .label-product-name {
            font-size: 7pt;
            max-height: 8mm;
        }
        .label-sku {
            font-size: 6pt;
        }
        .label-price {
            font-size: 9pt;
        }
        .label-barcode {
            max-height: 12mm;
        }
        @endif

        /* 1x10 Column (Large labels) */
        @if($layout['columns'] == 1)
        .label {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            text-align: left;
        }
        .label-product-name {
            font-size: 10pt;
            flex: 1;
            text-align: left;
            margin-right: 4mm;
        }
        .label-barcode {
            flex: 0 0 auto;
            max-height: 20mm;
        }
        .label-info {
            flex: 0 0 auto;
            text-align: right;
            margin-left: 4mm;
        }
        @endif
    </style>
</head>
<body>
    <div class="page">
        <div class="labels-container">
            @foreach($data as $item)
                <div class="label">
                    @if($layout['columns'] == 1)
                        {{-- Horizontal layout for 1x10 --}}
                        @if($options['include_name'])
                            <div class="label-product-name">
                                {{ Str::limit($item['product']->name, 40) }}
                            </div>
                        @endif
                        
                        <div class="label-barcode">
                            <img src="data:image/png;base64,{{ $item['barcode_base64'] }}" alt="Barcode">
                        </div>
                        
                        <div class="label-info">
                            @if($options['include_sku'])
                                <div class="label-sku">{{ $item['product']->sku }}</div>
                            @endif
                            @if($options['include_price'])
                                <div class="label-price">Rp {{ number_format($item['product']->price, 0, ',', '.') }}</div>
                            @endif
                        </div>
                    @else
                        {{-- Vertical layout for 4x6 and 2x7 --}}
                        @if($options['include_name'])
                            <div class="label-product-name">
                                {{ Str::limit($item['product']->name, 30) }}
                            </div>
                        @endif
                        
                        <div class="label-barcode">
                            <img src="data:image/png;base64,{{ $item['barcode_base64'] }}" alt="Barcode">
                        </div>
                        
                        @if($options['include_sku'])
                            <div class="label-sku">{{ $item['product']->sku }}</div>
                        @endif
                        
                        @if($options['include_price'])
                            <div class="label-price">Rp {{ number_format($item['product']->price, 0, ',', '.') }}</div>
                        @endif
                    @endif
                </div>

                {{-- Page break every (columns * rows) labels --}}
                @if($loop->iteration % ($layout['columns'] * $layout['rows']) == 0 && !$loop->last)
                    </div>
                    </div>
                    <div class="page">
                    <div class="labels-container">
                @endif
            @endforeach
        </div>
    </div>
</body>
</html>