# -*- coding: utf-8 -*-
import calendar
from datetime import date

from odoo import models

from . import func


class LibroIva(models.Model):
    _inherit = 'libro.iva'

    def detalle_compra(self):
        self.limpieza_compra()
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
            list_invoice = func.search_invoice(self, 'compras', 'in_invoice', fecha, self.company_id.id, False)
            # print('LISTADO DE IDS DE FACTURAS',list_invoice)
            if list_invoice:
                # print("Funcion para guardar las facturas")
                for inv in list_invoice:
                    data = {'libro_iva_id': self.id,
                            'correlativo': correlativo,
                            'fecha_emision': inv.invoice_date,
                            'num_doc': inv.name,
                            'partner_id': inv.partner_id.id}
                    correlativo += 1

                    # si es nota de credito de el mismo dia, y monto
                    if inv.state_refund == 'refund':
                        if inv.inv_refund_id.invoice_date == inv.invoice_date:
                            if inv.inv_refund_id.amount_total == inv.amount_total:
                                self.env['libro.iva.compra'].create(data)
                                data['num_doc'] = inv.inv_refund_id.name
                                self.env['libro.iva.compra'].create(data)
                                # agregamos factura anulada para no duplicarla al final
                                refund_inv_list.append(inv.inv_refund_id.id)
                                continue
                        else:
                            # si es anulacion de otro dia
                            # funcion para obtener datos de factura buena
                            data = self.data_invoice_compras(inv, data, 'refund')
                            self.env['libro.iva.compra'].create(data)
                            # funcion para obtener datos de fatura anulada
                            data['num_doc'] = inv.inv_refund_id.name
                            data = self.data_invoice_compras(inv.inv_refund_id, data, 'refund')
                            self.env['libro.iva.compra'].create(data)
                            # agregamos factura anulada para no duplicarla al final
                            refund_inv_list.append(inv.inv_refund_id.id)
                            continue

                        # funcion para obtener datos
                    data = self.data_invoice_compras(inv, data, 'no_refund')
                    self.env['libro.iva.compra'].create(data)
        self.resumen_compras()
        return True

    def data_invoice_compras(self, inv, data, tipo):
        internas_e = 0
        internas_g = 0
        credito_fiscal = 0
        anticipo_iva_ret = 0
        anticipo_iva_rec = 0
        importaciones_e = 0
        importaciones_g = 0
        # buscamos todas las lineas exentas
        for a in inv.invoice_line_ids:
            if a.tax_ids:
                for i in a.tax_ids:
                    if i.type_tax == 'exento':
                        internas_e += a.price_subtotal
                    if i.type_tax == 'importacionE':
                        importaciones_e += a.price_subtotal
                        # print(importaciones_e, '**************')
        # buscamos todas las lineas gravadas
        for l in inv.line_ids:
            if l.tax_line_id.type_tax == 'iva_compra':
                credito_fiscal += l.price_total
                internas_g += l.tax_base_amount
            if l.tax_line_id.type_tax == 'retencion':
                anticipo_iva_ret += l.price_total
            if l.tax_line_id.type_tax == 'percepcion1':
                anticipo_iva_rec += l.price_total
            if l.tax_line_id.type_tax == 'importacionG':
                importaciones_g += l.tax_base_amount + l.price_total
        if tipo == 'no_refund':
            # if tipo_comprobante == 'compras':
            data['internas_e'] = internas_e
            data['internas_g'] = internas_g
            data['credito_fiscal'] = credito_fiscal
            data['anticipo_iva_ret'] = anticipo_iva_ret
            data['anticipo_iva_rec'] = anticipo_iva_rec
            data['importaciones_e'] = importaciones_e
            data['importaciones_g'] = importaciones_g
            data[
                'total_compras'] = internas_e + importaciones_e + importaciones_g + internas_g + credito_fiscal - anticipo_iva_ret + anticipo_iva_rec
        else:
            data['internas_e'] = internas_e * -1
            data['internas_g'] = internas_g * -1
            data['credito_fiscal'] = credito_fiscal * -1
            data['anticipo_iva_ret'] = anticipo_iva_ret * -1
            data['anticipo_iva_rec'] = anticipo_iva_rec * -1
            data['importaciones_e'] = importaciones_e * -1
            data['importaciones_g'] = importaciones_g * -1
            data['total_compras'] = (
                                            internas_e + importaciones_e + importaciones_g + internas_g + credito_fiscal - anticipo_iva_ret + anticipo_iva_rec) * -1
        return data

    def limpieza_compra(self):
        # borramos todo para que cada actualizacion se escriba en limpio
        self.env.cr.execute('DELETE FROM libro_iva_compra WHERE libro_iva_id=' + str(self.id))
        return True

    def resumen_compras(self):
        # Inicio de variables
        internas_e = 0
        importaciones_e = 0
        internas_g = 0
        importaciones_g = 0
        iva_credito_g = 0
        retenciones = 0
        percepciones = 0
        totales = 0
        excluidas = 0

        # recorremos todas las lineas para obtener datos
        for l in self.detalle_iva_compra_ids:
            internas_e += l.internas_e
            importaciones_e += l.importaciones_e
            internas_g += l.internas_g
            importaciones_g += l.importaciones_g
            iva_credito_g += l.credito_fiscal
            retenciones += l.anticipo_iva_ret
            percepciones += l.anticipo_iva_rec
            totales += l.total_compras
            excluidas = l.compra_suj_e

        # guardamos todos los resumen
        self.env['resumen.line'].create({
            'detalle': "Compras Internas Exentas",
            'total': internas_e,
            'libro_iva_id': self.id,
        })
        self.env['resumen.line'].create({
            'detalle': "Importaciones Exentas",
            'total': importaciones_e,
            'libro_iva_id': self.id,
        })
        self.env['resumen.line'].create({
            'detalle': "Compras Internas Gravadas",
            'total': internas_g,
            'libro_iva_id': self.id,
        })
        self.env['resumen.line'].create({
            'detalle': "Importaciones Gravadas",
            'total': importaciones_g,
            'libro_iva_id': self.id,
        })
        self.env['resumen.line'].create({
            'detalle': "Credito Fiscal",
            'total': iva_credito_g,
            'libro_iva_id': self.id,
        })
        self.env['resumen.line'].create({
            'detalle': "Retenciones",
            'total': retenciones,
            'libro_iva_id': self.id,
        })
        self.env['resumen.line'].create({
            'detalle': "Percepciones",
            'total': percepciones,
            'libro_iva_id': self.id,
        })
        self.env['resumen.line'].create({
            'detalle': "Ventas Totales",
            'total': totales,
            'libro_iva_id': self.id,
        })
        self.env['resumen.line'].create({
            'detalle': "Compras Excluidas",
            'total': excluidas,
            'libro_iva_id': self.id,
        })
        return True
