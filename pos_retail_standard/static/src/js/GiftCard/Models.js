odoo.define('pos_retail_standard.models', function (require) {
    "use strict";

    var models = require('point_of_sale.models');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var _t = core._t;
    var utils = require('web.utils');
    var session = require('web.session');

    var round_pr = utils.round_precision;
    var QWeb = core.qweb;

    models.load_fields("pos.payment.method", ['jr_use_for'])

    var _super_paymentline = models.Paymentline.prototype;
    var _super_Order = models.Order.prototype;

    models.PosModel.prototype.models.push({
        model: 'pos.gift.card.type',
        fields: ['name'],
        loaded: function (self, card_type) {
            self.card_type = card_type;
        },
    }, {
        model: 'pos.gift.card',
        domain: [['is_active', '=', true]],
        loaded: function (self, gift_cards) {
            self.db.add_giftcard(gift_cards);
            self.set({'gift_card_order_list': gift_cards});
        },
    });

    models.Order = models.Order.extend({
        initialize: function (attributes, options) {
            var res = _super_Order.initialize.apply(this, arguments);
            this.set({
                rounding: true,
            });
            this.redeem = false;
            this.recharge = false;
            this.giftcard = [];
            this.if_gift_card = false
            return this;
        },
        getOrderReceiptEnv: function () {
            // Formerly get_receipt_render_env defined in ScreenWidget.
            var res = _super_Order.getOrderReceiptEnv.call(this);
            var barcode_val = this.get_giftcard();
            var barcode_recharge_val = this.get_recharge_giftcard();
            var barcode_redeem_val = this.get_redeem_giftcard();

            if (barcode_val && barcode_val[0]) {
                var barcode = barcode_val[0].card_no;
            } else if (barcode_recharge_val) {
                var barcode = barcode_recharge_val.recharge_card_no;
            } else if (barcode_redeem_val) {
                var barcode = barcode_redeem_val.redeem_card;
            }
            if (barcode) {
                var img = new Image();
                img.id = "test-barcode";
                $(img).JsBarcode(barcode.toString());
                res.receipt['barcode'] = $(img)[0] ? $(img)[0].src : false;
            }
            return res;
        },

        set_is_rounding: function (rounding) {
            this.set('rounding', rounding);
        },
        get_is_rounding: function () {
            return this.get('rounding');
        },
        getNetTotalTaxIncluded: function () {
            var total = this.get_total_with_tax();
            return total;
        },
        // gift_card
        set_giftcard: function (giftcard) {
            this.giftcard.push(giftcard);
        },
        get_giftcard: function () {
            return this.giftcard;
        },
        set_recharge_giftcard: function (recharge) {
            this.recharge = recharge;
        },
        get_recharge_giftcard: function () {
            return this.recharge;
        },
        set_redeem_giftcard: function (redeem) {
            this.redeem = redeem;
        },
        get_redeem_giftcard: function () {
            return this.redeem;
        },
        // gift_card
        // rounding off for unuse product
        get_rounding_applied: function () {
            var rounding_applied = _super_Order.get_rounding_applied.call(this);
            var rounding = this.get_is_rounding();
            if (this.pos.config.cash_rounding && !rounding && rounding_applied != 0) {
                rounding_applied = 0
                return rounding_applied;
            }
            return rounding_applied;
        },
        has_not_valid_rounding: function () {
            var rounding_applied = _super_Order.has_not_valid_rounding.call(this);
            var rounding = this.get_is_rounding();
            var line_rounding = true;
            if (!this.pos.config.cash_rounding)
                return false;
            if (this.pos.config.cash_rounding && !rounding)
                return false;
            var lines = this.paymentlines.models;

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                if (line.payment_method.jr_use_for) {
                    line_rounding = false;
                    break
                } else {
                    line_rounding = true;
                }
            }
            if (!line_rounding) {
                return false;
            } else {
                if (!utils.float_is_zero(line.amount - round_pr(line.amount, this.pos.cash_rounding[0].rounding), 6))
                    return line;
            }
            return false;
        },
        // send detail in backend order
        export_as_JSON: function () {
            var orders = _super_Order.export_as_JSON.call(this);
            // gift card
            orders.giftcard = this.get_giftcard() || false;
            orders.recharge = this.get_recharge_giftcard() || false;
            orders.redeem = this.get_redeem_giftcard() || false;
            return orders;
        },
        // send detail in report
        export_for_printing: function () {
            var orders = _super_Order.export_for_printing.call(this);
            // gift card
            orders.giftcard = this.get_giftcard() || false;
            orders.recharge = this.get_recharge_giftcard() || false;
            orders.redeem = this.get_redeem_giftcard() || false;
            return orders;
        },
    });

    models.Paymentline = models.Paymentline.extend({
        initialize: function (attributes, options) {
            var self = this;
            _super_paymentline.initialize.apply(this, arguments);
        },
        set_giftcard_line_code: function (gift_card_code) {
            this.gift_card_code = gift_card_code;
        },
        get_giftcard_line_code: function () {
            return this.gift_card_code;
        },
    });

});
