odoo.define('pos_retail_standard.NumberPopup', function (require) {
    'use strict';

    const NumberPopup = require('point_of_sale.NumberPopup');
    const Registries = require('point_of_sale.Registries');
    const {posbus} = require('point_of_sale.utils');
    const {useExternalListener} = owl.hooks;

    const RetailNumberPopup = (NumberPopup) =>
        class extends NumberPopup {
            constructor() {
                super(...arguments);
                useExternalListener(window, 'keyup', this._keyUp);
            }

            willUnmount() {
                super.willUnmount();
                posbus.off('scan.barcode.validate.badgeID', this, null);

            }

            mounted() {
                super.mounted();
                posbus.on('scan.barcode.validate.badgeID', this, this._scanbarcode); // validate by manager via scan badgetID of user manager
            }

            _scanbarcode(code) {
                if (!code || code == "") {
                    return
                }
                const userValidate = this.env.pos.users.find(u => u.barcode == code)
                if (userValidate) {
                    this.props.resolve({confirmed: true, payload: userValidate['pos_security_pin']});
                    this.trigger('close-popup');
                    this.env.pos.alert_message({
                        title: this.env._t('Successfully'),
                        body: this.env._t('Manager Approved !!!'),
                        color: 'success'
                    })
                    this.env.pos.validate_manager = true;
                }
            }

            _keyUp(event) {
                if (event.key == 'F1') {
                    this.fullFillValue()
                }
                if (event.key == 'Enter') {
                    this.confirm()
                }
            }

            async fullFillValue() {
                this.state.buffer = this.props.fullFillAmount
                this.confirm()
            }
        };

    Registries.Component.extend(NumberPopup, RetailNumberPopup);
    return RetailNumberPopup

});
