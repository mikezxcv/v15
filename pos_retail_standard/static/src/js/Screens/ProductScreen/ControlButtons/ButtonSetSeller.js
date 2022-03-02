odoo.define('pos_retail_standard.ButtonSetSeller', function (require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const ProductScreen = require('point_of_sale.ProductScreen');
    const {useListener} = require('web.custom_hooks');
    const Registries = require('point_of_sale.Registries');

    class ButtonSetSeller extends PosComponent {
        constructor() {
            super(...arguments);
            useListener('click', this.onClick);
        }

        get isHighlighted() {
            return true
        }

        async onClick() {
            const order = this.env.pos.get_order();
            if (!order || !order.get_selected_orderline()) {
                return this.env.pos.alert_message({
                    title: this.env._t('Error'),
                    body: this.env._t('Your order is blank cart')
                })
            }
            const list = this.env.pos.sellers.map(seller => ({
                id: seller.id,
                label: seller.name,
                isSelected: false,
                item: seller
            }))
            let {confirmed, payload: seller} = await this.showPopup('SelectionPopup', {
                title: this.env._t('Please choice one Seller'),
                list: list
            })
            if (confirmed) {
                order.get_selected_orderline().set_sale_person(seller)
            }
        }
    }

    ButtonSetSeller.template = 'ButtonSetSeller';

    ProductScreen.addControlButton({
        component: ButtonSetSeller,
        condition: function () {
            return this.env.pos.sellers.length;
        },
    });

    Registries.Component.add(ButtonSetSeller);

    return ButtonSetSeller;
});
