# -*- coding: utf-8 -*-
import calendar
from datetime import date

from odoo import models

from . import func


class LibroIva(models.Model):
    _inherit = 'libro.iva'

    def detalle_ccf(self):
        func.limpieza_ccf(self)
        mes = int(self.mes)
        year = self.fecha.year
        dia = calendar.monthrange(year, mes)
        refund_inv_list = []
        # print(dia,mes,year,'***************')
        correlativo = 1
        for i in range(dia[1]):
            # aumentamos uno a la variable que representa los dias
            i += 1
            fecha = date(year, mes, i)
            # print(fecha,'Fecha de Busqueda de Facturas')
            list_invoice = func.search_invoice(self, 'ccf', 'out_invoice', fecha, self.company_id.id, False)
            # print('LISTADO DE IDS DE FACTURAS',list_invoice)
            if list_invoice:
                # print("Funcion para guardar las facturas")
                for inv in list_invoice:
                    data = {'libro_iva_id': self.id,
                            'correlativo': correlativo,
                            'fecha_emision': inv.invoice_date,
                            'num_corr_preimp': inv.name,
                            'partner_id': inv.partner_id.id}
                    correlativo += 1

                    # si es nota de credito de el mismo dia, y monto
                    if inv.state_refund == 'refund':
                        if inv.inv_refund_id.invoice_date == inv.invoice_date:
                            if inv.inv_refund_id.amount_total == inv.amount_total:
                                self.env['iva.credito.fiscal'].create(data)
                                data['num_corr_preimp'] = inv.inv_refund_id.name
                                self.env['iva.credito.fiscal'].create(data)
                                # agregamos factura anulada para no duplicarla al final
                                refund_inv_list.append(inv.inv_refund_id.id)
                                continue
                        else:
                            # si es anulacion de otro dia
                            # funcion para obtener datos de factura buena
                            data = self.data_invoice(inv, data, 'refund')
                            self.env['iva.credito.fiscal'].create(data)
                            # funcion para obtener datos de fatura anulada
                            data['num_corr_preimp'] = inv.inv_refund_id.name
                            data = self.data_invoice(inv.inv_refund_id, data, 'refund')
                            self.env['iva.credito.fiscal'].create(data)
                            # agregamos factura anulada para no duplicarla al final
                            refund_inv_list.append(inv.inv_refund_id.id)
                            continue

                    # funcion para obtener datos
                    data = self.data_invoice(inv, data, 'no_refund')
                    self.env['iva.credito.fiscal'].create(data)

            # buscamos las notas de creditos pendientes
            list_refund = func.search_invoice(self, 'ccf', 'out_refund', fecha, self.company_id.id, refund_inv_list)
            if list_refund:
                for inv in list_invoice:
                    data = {}
                    data['libro_iva_id'] = self.id
                    data['correlativo'] = correlativo
                    correlativo += 1
                    data['fecha_emision'] = inv.invoice_date
                    data['num_corr_preimp'] = inv.name
                    data['partner_id'] = inv.partner_id.id
                    # funcion para obtener datos
                    data = self.data_invoice(inv, data, 'refund')
                    self.env['iva.credito.fiscal'].create(data)
        self.resumen_ccf()
        return True

    def data_invoice(self, inv, data, tipo):
        prp_exentas = 0
        prp_gravadas = 0
        prp_debito_fiscal = 0
        iva_retenido = 0
        iva_percibido = 0
        # buscamos todas las lineas exentas
        for a in inv.invoice_line_ids:
            if a.tax_ids:
                for i in a.tax_ids:
                    if i.type_tax == 'exento':
                        prp_exentas += a.price_subtotal

        # buscamos todas las lineas gravadas
        for l in inv.line_ids:
            if l.tax_line_id.type_tax == 'iva_venta':
                prp_debito_fiscal += l.price_total
                prp_gravadas += l.tax_base_amount
            if l.tax_line_id.type_tax == 'retencion':
                iva_retenido += l.price_total
            if l.tax_line_id.type_tax == 'percepcion1' or l.tax_line_id.type_tax == 'percepcion2':
                iva_percibido += l.price_total
        if tipo == 'no_refund':
            data['prp_exentas'] = prp_exentas
            data['prp_gravadas'] = prp_gravadas
            data['prp_debito_fiscal'] = prp_debito_fiscal
            data['iva_retenido'] = iva_retenido
            data['iva_percibido'] = iva_percibido
            data['total'] = prp_exentas + prp_gravadas + prp_debito_fiscal - iva_retenido + iva_percibido
        else:
            data['prp_exentas'] = prp_exentas * -1
            data['prp_gravadas'] = prp_gravadas * -1
            data['prp_debito_fiscal'] = prp_debito_fiscal * -1
            data['iva_retenido'] = iva_retenido * -1
            data['iva_percibido'] = iva_percibido * -1
            data['total'] = (prp_exentas + prp_gravadas + prp_debito_fiscal - iva_retenido + iva_percibido) * -1
        return data

    def resumen_ccf(self):
        # Inicio de variables
        ventas_exentas = 0
        ventas_gravadas = 0
        retenciones = 0
        debito_fiscal = 0
        iva_percibido = 0
        totales = 0

        # recorremos todas las lineas para obtener datos
        for l in self.detalle_iva_credito_fiscal_ids:
            ventas_exentas += l.prp_exentas
            ventas_gravadas += l.prp_gravadas
            retenciones += l.iva_retenido
            debito_fiscal += l.prp_debito_fiscal
            iva_percibido += l.iva_percibido
            totales += l.total

        # guardamos todos los resumen
        self.env['resumen.line'].create({
            'detalle': "Ventas Exentas",
            'total': ventas_exentas,
            'libro_iva_id': self.id,
        })
        self.env['resumen.line'].create({
            'detalle': "Ventas Gravadas",
            'total': ventas_gravadas,
            'libro_iva_id': self.id,
        })
        self.env['resumen.line'].create({
            'detalle': "Debito Fiscal",
            'total': debito_fiscal,
            'libro_iva_id': self.id,
        })
        self.env['resumen.line'].create({
            'detalle': "Retenciones",
            'total': retenciones,
            'libro_iva_id': self.id,
        })
        self.env['resumen.line'].create({
            'detalle': "Retenciones",
            'total': iva_percibido,
            'libro_iva_id': self.id,
        })
        self.env['resumen.line'].create({
            'detalle': "Ventas Totales",
            'total': totales,
            'libro_iva_id': self.id,
        })
        return True
