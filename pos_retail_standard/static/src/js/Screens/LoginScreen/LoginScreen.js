odoo.define('pos_retail_standard.LoginScreen', function (require) {
    'use strict';

    const LoginScreen = require('pos_hr.LoginScreen');
    const Registries = require('point_of_sale.Registries');
    const {useExternalListener} = owl.hooks;
    const {posbus} = require('point_of_sale.utils');

    const {Component} = owl;
    const current = Component.current;

    const liveStreamConfig = {
        inputStream: {
            type: "LiveStream",
            constraints: {
                width: {min: 150},
                height: {min: 150},
                aspectRatio: {min: 1, max: 500},
                facingMode: "environment" // or "user" for the front camera
            }
        },
        locator: {
            patchSize: "medium",
            halfSample: true
        },
        numOfWorkers: (navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4),
        decoder: {
            "readers": [
                {"format": "ean_reader", "config": {}}
            ]
        },
        locate: true
    };
    const fileConfig = $.extend(
        {},
        liveStreamConfig,
        {
            inputStream: {
                size: 800
            }
        }
    );

    const RetailLoginScreen = (LoginScreen) =>
        class extends LoginScreen {
            constructor() {
                super(...arguments);
                useExternalListener(window, 'keyup', this._keyUp);
            }

            // mounted() {
            //     super.mounted();
            //     try {
            //         this.initCamera();
            //         this.addCameraScanBarcodeEvent();
            //         this._automaticScanBarcodes()
            //     } catch (ex) {
            //         return
            //     }
            // }
            //
            // willUnmount() {
            //     super.willUnmount();
            //     try {
            //         Quagga.stop();
            //     } catch (ex) {
            //         return
            //     }
            // }

            willUnmount() {
                super.willUnmount();
                posbus.off('scan.barcode.validate.badgeID', this, null);

            }

            mounted() {
                const self = this;
                super.mounted();
                posbus.on('scan.barcode.validate.badgeID', this, this._scanbarcode);
            }

            async _keyUp(event) {
                if (event.key == "Enter") {
                    await this.selectCashier()
                }
                if (event.key == "Escape") {
                    this.closeSession()
                }
            }

            async _scanbarcode(code) {
                const employee = this.env.pos.employees.find(emp => emp['barcode'] == Sha1.hash(code))
                if (employee) {
                    await this.assignEmployeetoSession(employee)
                }
            }

            initCamera() {
                var self = this;
                try {
                    Quagga.init(
                        liveStreamConfig,
                        function (err) {
                            if (err) {
                                console.error(err.name)
                                console.error(err.message)
                                Quagga.stop();
                                return true;
                            }
                            Quagga.start();
                        }
                    );
                } catch (e) {
                    console.warn(e);
                    this.env.pos.alert_message({
                        title: this.env._t('Error'),
                        body: this.env._t("Your Camera Device not ready scanning barcode. This future only support SSL (https). Please setup your Odoo within ssl")
                    })
                }
            }

            async addCameraScanBarcodeEvent() {
                this.barcodeScan = [];
                if (this.camera_registered) {
                    return
                }
                const self = this;
                await Quagga.onProcessed(function (result) {
                    var drawingCtx = Quagga.canvas.ctx.overlay,
                        drawingCanvas = Quagga.canvas.dom.overlay;

                    if (result) {
                        if (result.boxes) {
                            drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));
                            result.boxes.filter(function (box) {
                                return box !== result.box;
                            }).forEach(function (box) {
                                Quagga.ImageDebug.drawPath(box, {x: 0, y: 1}, drawingCtx, {
                                    color: "green",
                                    lineWidth: 2
                                });
                            });
                        }

                        if (result.box) {
                            Quagga.ImageDebug.drawPath(result.box, {x: 0, y: 1}, drawingCtx, {
                                color: "#00F",
                                lineWidth: 2
                            });
                        }

                        if (result.codeResult && result.codeResult.code) {
                            Quagga.ImageDebug.drawPath(result.line, {x: 'x', y: 'y'}, drawingCtx, {
                                color: 'red',
                                lineWidth: 3
                            });
                        }
                    }
                });

                // Once a barcode had been read successfully, stop quagga and
                // close the modal after a second to let the user notice where
                // the barcode had actually been found.
                await Quagga.onDetected(function (result) {
                    if (result.codeResult.code) {
                        const code = result.codeResult.code;
                        console.log(code);
                        if (!self.barcodeScan.includes(code)) {
                            self.barcodeScan.push(code)
                        }
                        Quagga.stop();
                        setTimeout(function () {
                            self.addCameraScanBarcodeEvent()
                        }, self.env.pos.config.barcode_scan_timeout)
                    }
                });
                this.camera_registered = true;
            }

            _automaticScanBarcodes() {
                if (this.barcodeScan && this.barcodeScan.length) {
                    this.env.pos.scanDirectCamera = true
                    for (let i = 0; i < this.barcodeScan.length; i++) {
                        let code = this.barcodeScan[i];
                        this.env.pos.barcode_reader.scan(code);
                    }
                    this.barcodeScan = []
                    this.initCamera();
                    this.env.pos.scanDirectCamera = false
                }
                setTimeout(_.bind(this._automaticScanBarcodes, this), 200);
            }

            async selectCashier() {
                const list = this.env.pos.employees.map((employee) => {
                    return {
                        id: employee.id,
                        item: employee,
                        label: employee.name,
                        isSelected: false,
                        imageUrl: 'data:image/png;base64, ' + employee['image_1920'],
                    };
                });

                const employee = await this.selectEmployee(list);
                if (employee) {
                    employee['is_employee'] = true;
                    await this.assignEmployeetoSession(employee)
                }
                return false
            }

            async assignEmployeetoSession(employee) {
                this.env.pos.set_cashier(employee);
                if (this.env.pos.config.multi_session) {
                    try {
                        let sessionValue = await this.rpc({
                            model: 'pos.session',
                            method: 'get_session_by_employee_id',
                            args: [[], employee.id, this.env.pos.config.id],
                        })
                        const sessionLogin = sessionValue['session']
                        this.env.pos.pos_session = sessionLogin
                        this.env.pos.login_number = sessionValue.login_number + 1
                        this.env.pos.set_cashier(employee);
                        this.env.pos.db.save('pos_session_id', this.env.pos.pos_session.id);
                        const orders = this.env.pos.get('orders').models;
                        for (let i = 0; i < orders.length; i++) {
                            orders[i]['pos_session_id'] = sessionLogin['id']
                        }
                        if (this.env.pos.config.cash_control && sessionLogin['state'] != 'opening_control') {
                            posbus.trigger('close-cash-screen')
                        }
                        if (this.env.pos.config.cash_control && sessionLogin['state'] == 'opening_control') {
                            posbus.trigger('open-cash-screen')
                        }
                    } catch (error) {
                        if (error.message.code < 0) {
                            await this.showPopup('OfflineErrorPopup', {
                                title: this.env._t('Offline'),
                                body: this.env._t('Unable to save changes.'),
                            });
                        }
                    }

                }
                return this.back();
            }
        }
    Registries.Component.extend(LoginScreen, RetailLoginScreen);

    return RetailLoginScreen;
});
