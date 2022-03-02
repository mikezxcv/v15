# -*- coding: utf-8 -*-
from odoo import models, fields, api, _
from odoo.tools.safe_eval import safe_eval
from odoo.exceptions import UserError

class AccountMoveRefund(models.TransientModel):
  """Refunds invoice"""

  _inherit = "account.move.reversal"

  def reverse_moves(self):
    moves = self.move_ids or self.env['account.move'].browse(self._context['active_ids'])

    # Create default values.
    default_values_list = []
    for move in moves:
      default_values_list.append({
          'ref': _('Reversal of: %s, %s') % (move.name, self.reason) if self.reason else _('Reversal of: %s') % (move.name),
          'date': self.date or move.date,
          'invoice_date': move.is_invoice(include_receipts=True) and (self.date or move.date) or False,
          'journal_id': self.journal_id and self.journal_id.id or move.journal_id.id,
          'invoice_payment_term_id': None,
          'inv_refund_id': move.id
      })

    # Handle reverse method.
    if self.refund_method == 'cancel' or (moves and moves[0].move_type == 'entry'):
      new_moves = moves._reverse_moves(default_values_list, cancel=True)
    elif self.refund_method == 'modify':
      new_moves = moves._reverse_moves(default_values_list, cancel=True)
      moves_vals_list = []
      for move in moves.with_context(include_business_fields=True):
        moves_vals_list.append(move.copy_data({
            'invoice_payment_ref': move.name,
            'date': self.date or move.date,
        })[0])
      new_moves = moves.create(moves_vals_list)
    elif self.refund_method == 'refund':
      new_moves = moves._reverse_moves(default_values_list)
    else:
      return
    # Create action.
    action = {
        'name': _('Reverse Moves'),
        'type': 'ir.actions.act_window',
        'res_model': 'account.move',
    }
    if len(new_moves) == 1:
      action.update({
          'view_mode': 'form',
          'res_id': new_moves.id,
      })
      moves.write({
        'inv_refund_id': new_moves.id,
        'state_refund': 'refund',
        })
    else:
      action.update({
          'view_mode': 'tree,form',
          'domain': [('id', 'in', new_moves.ids)],
      })

    return action
