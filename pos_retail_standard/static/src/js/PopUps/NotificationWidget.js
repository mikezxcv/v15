odoo.define('pos_retail_standard.NotificationWidget', function (require) {
    'use strict';

    const {useListener} = require('web.custom_hooks');
    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    const {useState} = owl.hooks;
    const {posbus} = require('point_of_sale.utils');

    class NotificationWidget extends PosComponent {
        constructor() {
            super(...arguments)
            useListener('click', this.closeNotificationWidget);
            this.state = useState({
                isShow: false,
                title: '',
                message: '',
            });
        }

        mounted() {
            super.mounted()
            posbus.on('open-notification', this, this.openNotification);
            posbus.on('close-notification', this, this.closeNotificationWidget);
        }

        closeNotificationWidget() {
            this.state.isShow = false
            this.state.title = ''
            this.state.message = ''
        }

        openNotification(detail) {
            this.state.isShow = true
            this.state.title = detail.title
            this.state.message = detail.message
            const self = this
            setTimeout(() => {
                self.state.isShow = false;
            }, detail.duration)
        }
    }

    NotificationWidget.template = 'NotificationWidget';

    Registries.Component.add(NotificationWidget);

    return NotificationWidget;
});
