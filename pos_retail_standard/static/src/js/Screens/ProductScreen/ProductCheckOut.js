odoo.define('pos_retail_standard.ProductCheckOut', function (require) {
    'use strict';
    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    const ControlButtonsMixin = require('point_of_sale.ControlButtonsMixin');
    const {useState} = owl.hooks;

    class ProductCheckOut extends ControlButtonsMixin(PosComponent) {
        constructor() {
            super(...arguments);
            this._currentOrder = this.env.pos.get_order();
            if (this._currentOrder) {
                this._currentOrder.orderlines.on('change', this.render, this);
                this._currentOrder.orderlines.on('remove', this.render, this);
                this._currentOrder.orderlines.on('change', this._totalWillPaid, this);
                this._currentOrder.orderlines.on('remove', this._totalWillPaid, this);
                this._currentOrder.paymentlines.on('change', this._totalWillPaid, this);
                this._currentOrder.paymentlines.on('remove', this._totalWillPaid, this);
            }
            this.env.pos.on('change:selectedOrder', this._updateCurrentOrder, this);
            this.state = useState({total: 0, tax: 0});
            this._totalWillPaid()
        }

        _updateCurrentOrder(pos, newSelectedOrder) {
            this._currentOrder.orderlines.off('change', null, this);
            if (newSelectedOrder) {
                this._currentOrder = newSelectedOrder;
                this._currentOrder.orderlines.on('change', this.render, this);
            }
        }

        _totalWillPaid() {
            const total = this._currentOrder ? this._currentOrder.get_total_with_tax() : 0;
            const due = this._currentOrder ? this._currentOrder.get_due() : 0;
            const tax = this._currentOrder ? total - this._currentOrder.get_total_without_tax() : 0;
            this.state.total = total;
            this.state.tax = this.env.pos.format_currency(tax);
            this.render();
        }

        mounted() {
            const self = this;
            super.mounted();
        }

        willUnmount() {
            super.willUnmount();
        }

        get client() {
            return this.env.pos.get_client();
        }

        get isLongName() {
            return this.client && this.client.name.length > 10;
        }

        get currentOrder() {
            return this.env.pos.get_order();
        }

        get invisiblePaidButton() {
            const selectedOrder = this._currentOrder;
            if (!selectedOrder || !this.env.pos.config.allow_payment || (selectedOrder && selectedOrder.get_orderlines().length == 0)) {
                return true
            } else {
                return false
            }
        }
    }

    ProductCheckOut.template = 'ProductCheckOut';

    Registries.Component.add(ProductCheckOut);

    return ProductCheckOut;
});
