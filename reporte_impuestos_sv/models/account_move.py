# -*- coding: utf-8 -*-
from odoo import fields, models


class AccountMove(models.Model):
    _inherit = "account.move"
    registrado = fields.Boolean('Registrado en Libro de IVA',
                                help='- Estara activo si esta factura ya fue contabilizada en el libro de iva',
                                default=True)
