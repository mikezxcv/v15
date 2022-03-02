odoo.define('pos_retail_standard.SetPricelistButton', function (require) {
    'use strict';

    const SetPricelistButton = require('point_of_sale.SetPricelistButton');
    const Registries = require('point_of_sale.Registries');

    const RetailSetPricelistButton = (SetPricelistButton) =>
        class extends SetPricelistButton {
            async onClick() {
                super.onClick()
            }
        }
    Registries.Component.extend(SetPricelistButton, RetailSetPricelistButton);

    return RetailSetPricelistButton;
});
