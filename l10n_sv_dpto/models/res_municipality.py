# -*- coding: utf-8 -*-
from odoo import fields, models, _

class Departamento(models.Model):
  _name = "res.municipality"
  _description = _("Municipality")

  name = fields.Char(_("Name"), required=True, help=_("Name of municipality"), translate=True)
  code = fields.Char(_("Code"), required=True, help='Code of municipality')
  dpto_id = fields.Many2one('res.country.state', _("State"), required=True, help=_("State"))

  def copy(self, default=None):
    default = dict(default or {})
    copied_count = self.search_count(
        [('name', '=like', _(u"Copy of {}%").format(self.name))])
    if not copied_count:
      new_name = _(u"Copy of {}").format(self.name)
    else:
      new_name = _(u"Copy of {} ({})").format(self.name, copied_count)

    copied_count = self.search_count(
        [('code', '=like', _(u"Copy of {}%").format(self.code))])
    if not copied_count:
      new_code = _(u"Copy of {}").format(self.code)
    else:
      new_code = _(u"Copy of {} ({})").format(self.code, copied_count)

    default['name'] = new_name
    default['code'] = new_code
    return super(Departamento, self).copy(default)

  _sql_constraints = [
    
    (
      'code_unique',
      'unique (code)',
      'The code must be unique'
    )
  ]
  