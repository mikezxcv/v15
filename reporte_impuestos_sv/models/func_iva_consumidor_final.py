# -*- coding: utf-8 -*-
import calendar
from datetime import date

from odoo import models

from . import func


class LibroIva(models.Model):
    _inherit = 'libro.iva'

    def detalle_fcf(self):
        self.limpieza_consumidor_final()
        # Variables Iniciales Requeridas
        mes = int(self.mes)
        year = self.fecha.year
        dia = calendar.monthrange(year, mes)
        refund_inv_list = []
        # print(dia,mes,year,'***************')
        for i in range(dia[1]):
            # aumentamos uno a la variable que representa los dias
            i += 1
            fecha = date(year, mes, i)
            num_inicial = 0
            num_final = 0
            prefijo_ant = 0
            num_anterior = 0
            v_exentas = 0
            v_internas_gravadas = 0
            total_v_diarias_prop = 0
            # print(fecha, 'Fecha de Busqueda de Facturas')
            list_invoice = func.search_invoice(self, 'fcf', 'out_invoice', fecha, self.company_id.id, False)
            # print(list_invoice, '###############################')
            if list_invoice:
                # print("Funcion para guardar las facturas")
                for inv in list_invoice:
                    # variables iniciales requeridas por dia
                    v_exentas = 0
                    # revisamos toda las facturas del dia
                    v_internas_gravadas = 0
                    data = {'libro_iva_id': self.id,
                            'fecha': inv.invoice_date,
                            'num_inicial': 0,
                            'num_final': 0,
                            'v_exentas': 0,
                            'v_internas_gravadas': 0,
                            'total_v_diarias_prop': 0}

                    # validamos que no esta retificada
                    if inv.state_refund == 'no_refund':
                        # metodos si es factura no retificada
                        numeracion = func.numeracion(inv.name)

                        # print numeracion,'Datos'
                        prefijo = numeracion.get('pre')
                        numero = int(numeracion.get('num'))
                        # agregamos factura anulada para no duplicarla al final
                        refund_inv_list.append(inv.inv_refund_id.id)
                        if num_inicial == 0:
                            num_inicial = inv.name
                            num_final = inv.name
                            num_anterior = numero
                            prefijo_ant = prefijo
                            v_exent, v_intern_gravadas, total_v_diar_prop = self.data_invoice_fcf(inv, 'no_refund')

                            v_exentas += v_exent
                            v_internas_gravadas += v_intern_gravadas
                            total_v_diarias_prop += total_v_diar_prop
                            # print(v_exentas, v_internas_gravadas, total_v_diarias_prop, '######## UNO #######')

                        else:
                            if prefijo_ant != prefijo or (num_anterior + 1) != numero or inv.state_refund == 'refund':
                                # Guardar
                                data['num_inicial'] = num_inicial
                                data['num_final'] = num_final
                                data['v_exentas'] = v_exentas
                                data['v_internas_gravadas'] = v_internas_gravadas
                                data['total_v_diarias_prop'] = total_v_diarias_prop
                                self.env['iva.consumidor.final'].create(data)

                                num_anterior = numero
                                num_inicial = inv.name
                                num_final = inv.name
                                v_exentas = 0
                                v_internas_gravadas = 0
                                total_v_diarias_prop = 0
                                if inv.state_refund == 'refund':
                                    self.env['iva.consumidor.final'].create(data)
                                    num_anterior = 0
                                    num_inicial = 0
                                    num_final = 0
                                else:
                                    v_exent, v_intern_gravadas, total_v_diar_prop = self.data_invoice_fcf(inv,
                                                                                                          'no_refund')
                                    v_exentas += v_exent
                                    v_internas_gravadas += v_intern_gravadas
                                    total_v_diarias_prop += total_v_diar_prop
                                    # print(v_exentas, v_internas_gravadas, total_v_diarias_prop, '######## DOS #######')
                                # print(prefijo_ant, prefijo, num_anterior, numero, '*********TRES**********')
                            else:
                                if prefijo_ant == prefijo:
                                    prefijo_ant = prefijo
                                if (num_anterior + 1) == numero:
                                    num_anterior = numero
                                    num_final = inv.name
                                    v_exent, v_intern_gravadas, total_v_diar_prop = self.data_invoice_fcf(inv,
                                                                                                          'no_refund')
                                    v_exentas += v_exent
                                    v_internas_gravadas += v_intern_gravadas
                                    total_v_diarias_prop += total_v_diar_prop
                                    # print(v_exentas, v_internas_gravadas, total_v_diarias_prop, '######## TRES #######')

                    data['num_inicial'] = num_inicial
                    data['num_final'] = num_final
                    data['v_exentas'] = v_exentas
                    data['v_internas_gravadas'] = v_internas_gravadas
                    data['total_v_diarias_prop'] = total_v_diarias_prop
                self.env['iva.consumidor.final'].create(data)

        self.resumen_fcf()
        return True

    def data_invoice_fcf(self, inv, tipo):
        v_exen = 0
        v_inter_gravadas = 0
        # buscamos todas las lineas exentas
        for a in inv.invoice_line_ids:
            if a.tax_ids:
                for i in a.tax_ids:
                    if i.type_tax == 'exento':
                        v_exen += a.price_subtotal
        # buscamos todas las lineas gravadas
        for l in inv.line_ids:
            if l.tax_line_id.type_tax == 'iva_venta':
                v_inter_gravadas += l.tax_base_amount + l.price_total
        if tipo == 'refund':
            v_exen = v_exen * -1
            v_inter_gravadas = v_inter_gravadas * -1
        total_v_dia_prop = v_exen + v_inter_gravadas
        return v_exen, v_inter_gravadas, total_v_dia_prop

    def limpieza_consumidor_final(self):
        # borramos todo para que cada actualizacion se escriba en limpio
        self.env.cr.execute('DELETE FROM iva_consumidor_final WHERE libro_iva_id=' + str(self.id))
        return True

    def resumen_fcf(self):

        # Inicio de variables
        ventas_exentas = 0
        ventas_gravadas = 0
        totales = 0

        # recorremos todas las lineas para obtener datos
        for l in self.detalle_iva_consu_final_ids:
            ventas_exentas += l.v_exentas
            ventas_gravadas += l.v_internas_gravadas
            totales += l.total_v_diarias_prop

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
            'detalle': "Ventas Totales",
            'total': totales,
            'libro_iva_id': self.id,
        })
        return True
