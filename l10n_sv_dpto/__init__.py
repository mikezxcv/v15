# -*- coding: utf-8 -*-
from . import models

from odoo import api, SUPERUSER_ID


def install_dpto_sv(cr, registry):
    env = api.Environment(cr, SUPERUSER_ID, {})
    itr_obj = env['ir.translation']
    itr_ids = itr_obj.search([('src', '=', 'State')])
    for t in itr_ids:
        t.value = 'Departamento'