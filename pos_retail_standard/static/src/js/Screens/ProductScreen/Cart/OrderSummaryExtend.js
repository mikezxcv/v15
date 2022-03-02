odoo.define('pos_retail_standard.OrderSummaryExtend', function (require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    const {useState} = owl.hooks;

    class OrderSummaryExtend extends PosComponent {
        constructor() {
            super(...arguments);
            this.state = useState({
                showSummaryExtend: true,
            });
        }

        get order() {
            return this.env.pos.get_order();
        }

        get client() {
            return this.env.pos.get_order().get_client();
        }

        get promotions() {
            let order = this.env.pos.get_order();
            return order.get_promotions_active()['promotions_active']
        }

        clickShowSummaryExtend() {
            this.state.showSummaryExtend = !this.state.showSummaryExtend
            this.render()
        }

        get isShowSummaryExtend() {
            return this.state.showSummaryExtend
        }

    }

    OrderSummaryExtend.template = 'OrderSummaryExtend';

    Registries.Component.add(OrderSummaryExtend);

    return OrderSummaryExtend;
});
