# -*- coding: utf-8 -*-
from odoo import api, SUPERUSER_ID

from . import models
from . import wizards


# Evitamos impresion desde la accion para que solo puedan utilizar metodo personalizado
def drop_print(cr, registry):
    env = api.Environment(cr, SUPERUSER_ID, {})
    report_ids = env['ir.actions.report'].search([('name', 'in', ['Consumidor Final', 'Credito Fiscal', 'Compras'])])
    for i in report_ids:
        i.unlink_action()
