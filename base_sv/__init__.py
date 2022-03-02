# -*- coding: utf-8 -*-
from . import models

from odoo import api, SUPERUSER_ID


def install_base_sv(cr, registry):
    env = api.Environment(cr, SUPERUSER_ID, {})
    itr_obj = env['ir.translation']
    itr_ids = itr_obj.search([('src', '=', 'VAT')])
    for t in itr_ids:
        t.value = 'N.I.T'
