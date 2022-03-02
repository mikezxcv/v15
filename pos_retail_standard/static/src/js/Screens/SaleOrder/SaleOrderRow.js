odoo.define('pos_retail_standard.SaleOrderRow', function (require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');

    class SaleOrderRow extends PosComponent {

        async _autoSyncBackend() {
            let order_object = this.env.pos.get_model('sale.order');
            let orders = await this.rpc({
                model: 'sale.order',
                method: 'search_read',
                fields: order_object.fields,
                args: [[['id', '=', this.props.order.id]]]
            })
            this.props.order = orders[0]
            let sale_order_line_object = this.env.pos.get_model('sale.order.line');
            let lines = await this.rpc({
                model: 'sale.order.line',
                method: 'search_read',
                fields: sale_order_line_object.fields,
                args: [[['order_id', '=', this.props.order.id]]]
            })
            this.props.order['lines'] = lines
            this.render()
            console.log('[_autoSyncBackend] Sale Order ID: ' + this.props.order.id)
        }

        get getHighlight() {
            return this.props.order !== this.props.selectedOrder ? '' : 'highlight';
        }

        showMore() {
            const order = this.props.order;
            const link = window.location.origin + "/web#id=" + order.id + "&view_type=form&model=sale.order";
            window.open(link, '_blank')
        }
    }

    SaleOrderRow.template = 'SaleOrderRow';

    Registries.Component.add(SaleOrderRow);

    return SaleOrderRow;
});
