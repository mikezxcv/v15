odoo.define('pos_retail_standard.BarcodeReader', function (require) {
    var BarcodeReader = require('point_of_sale.BarcodeReader');
    const {posbus} = require('point_of_sale.utils');

    BarcodeReader.include({
        scan: function (code) {
            this._super(code)
            if (code && code != "") {
                posbus.trigger('scan.barcode.validate.badgeID', code)
            }
        },
    });
});
