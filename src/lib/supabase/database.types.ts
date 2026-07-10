export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      anotacoes: {
        Row: {
          cliente_id: string | null
          concluida: boolean
          created_at: string
          detected_by_ia: boolean
          due: string | null
          id: string
          projeto_id: string | null
          tag: string | null
          texto: string
          user_id: string
        }
        Insert: {
          cliente_id?: string | null
          concluida?: boolean
          created_at?: string
          detected_by_ia?: boolean
          due?: string | null
          id?: string
          projeto_id?: string | null
          tag?: string | null
          texto: string
          user_id: string
        }
        Update: {
          cliente_id?: string | null
          concluida?: boolean
          created_at?: string
          detected_by_ia?: boolean
          due?: string | null
          id?: string
          projeto_id?: string | null
          tag?: string | null
          texto?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anotacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anotacoes_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      arquivos: {
        Row: {
          classificacao_ia: string | null
          cliente_id: string | null
          created_at: string
          id: string
          nome: string
          projeto_id: string | null
          storage_path: string
          user_id: string
        }
        Insert: {
          classificacao_ia?: string | null
          cliente_id?: string | null
          created_at?: string
          id?: string
          nome: string
          projeto_id?: string | null
          storage_path: string
          user_id: string
        }
        Update: {
          classificacao_ia?: string | null
          cliente_id?: string | null
          created_at?: string
          id?: string
          nome?: string
          projeto_id?: string | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arquivos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arquivos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      assinaturas: {
        Row: {
          asaas_subscription_id: string | null
          churn_score: number | null
          ciclo: string
          cliente_id: string | null
          created_at: string
          id: string
          moeda: Database["public"]["Enums"]["moeda"]
          plano: string | null
          proxima_cobranca: string | null
          status: Database["public"]["Enums"]["assinatura_status"]
          user_id: string
          valor: number
        }
        Insert: {
          asaas_subscription_id?: string | null
          churn_score?: number | null
          ciclo?: string
          cliente_id?: string | null
          created_at?: string
          id?: string
          moeda?: Database["public"]["Enums"]["moeda"]
          plano?: string | null
          proxima_cobranca?: string | null
          status?: Database["public"]["Enums"]["assinatura_status"]
          user_id: string
          valor: number
        }
        Update: {
          asaas_subscription_id?: string | null
          churn_score?: number | null
          ciclo?: string
          cliente_id?: string | null
          created_at?: string
          id?: string
          moeda?: Database["public"]["Enums"]["moeda"]
          plano?: string | null
          proxima_cobranca?: string | null
          status?: Database["public"]["Enums"]["assinatura_status"]
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_itens: {
        Row: {
          concluido: boolean
          fonte: string | null
          id: string
          marcado_por_ia: boolean
          ordem: number
          projeto_id: string
          texto: string
        }
        Insert: {
          concluido?: boolean
          fonte?: string | null
          id?: string
          marcado_por_ia?: boolean
          ordem?: number
          projeto_id: string
          texto: string
        }
        Update: {
          concluido?: boolean
          fonte?: string | null
          id?: string
          marcado_por_ia?: boolean
          ordem?: number
          projeto_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_itens_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          cnpj_vat: string | null
          contato_nome: string | null
          created_at: string
          email: string | null
          endereco: string | null
          etiquetas: string[]
          id: string
          moeda: Database["public"]["Enums"]["moeda"]
          nome: string
          origem: string | null
          pais: string
          proxima_acao_ia: string | null
          ramo: string | null
          score_ia: number | null
          status: Database["public"]["Enums"]["cliente_status"]
          telefone: string | null
          ultima_interacao: string | null
          user_id: string
          valor_potencial: number | null
        }
        Insert: {
          cnpj_vat?: string | null
          contato_nome?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          etiquetas?: string[]
          id?: string
          moeda?: Database["public"]["Enums"]["moeda"]
          nome: string
          origem?: string | null
          pais?: string
          proxima_acao_ia?: string | null
          ramo?: string | null
          score_ia?: number | null
          status?: Database["public"]["Enums"]["cliente_status"]
          telefone?: string | null
          ultima_interacao?: string | null
          user_id: string
          valor_potencial?: number | null
        }
        Update: {
          cnpj_vat?: string | null
          contato_nome?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          etiquetas?: string[]
          id?: string
          moeda?: Database["public"]["Enums"]["moeda"]
          nome?: string
          origem?: string | null
          pais?: string
          proxima_acao_ia?: string | null
          ramo?: string | null
          score_ia?: number | null
          status?: Database["public"]["Enums"]["cliente_status"]
          telefone?: string | null
          ultima_interacao?: string | null
          user_id?: string
          valor_potencial?: number | null
        }
        Relationships: []
      }
      custos: {
        Row: {
          categoria: string | null
          cliente_id: string | null
          created_at: string
          data: string
          descricao: string | null
          id: string
          recorrente: boolean
          user_id: string
          valor: number
        }
        Insert: {
          categoria?: string | null
          cliente_id?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          recorrente?: boolean
          user_id: string
          valor: number
        }
        Update: {
          categoria?: string | null
          cliente_id?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          recorrente?: boolean
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "custos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      etapas: {
        Row: {
          concluida_em: string | null
          duracao_dias: number | null
          final: boolean
          id: string
          media_dias: number | null
          nome: string
          ordem: number
          prazo: string | null
          projeto_id: string
          status: Database["public"]["Enums"]["etapa_status"]
        }
        Insert: {
          concluida_em?: string | null
          duracao_dias?: number | null
          final?: boolean
          id?: string
          media_dias?: number | null
          nome: string
          ordem?: number
          prazo?: string | null
          projeto_id: string
          status?: Database["public"]["Enums"]["etapa_status"]
        }
        Update: {
          concluida_em?: string | null
          duracao_dias?: number | null
          final?: boolean
          id?: string
          media_dias?: number | null
          nome?: string
          ordem?: number
          prazo?: string | null
          projeto_id?: string
          status?: Database["public"]["Enums"]["etapa_status"]
        }
        Relationships: [
          {
            foreignKeyName: "etapas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_agenda: {
        Row: {
          cliente_id: string | null
          created_at: string
          dia_inteiro: boolean
          fim: string | null
          id: string
          local: string | null
          notas: string | null
          projeto_id: string | null
          quando: string
          tipo: string | null
          tipo_ev: Database["public"]["Enums"]["evento_tipo"]
          titulo: string
          user_id: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          dia_inteiro?: boolean
          fim?: string | null
          id?: string
          local?: string | null
          notas?: string | null
          projeto_id?: string | null
          quando: string
          tipo?: string | null
          tipo_ev?: Database["public"]["Enums"]["evento_tipo"]
          titulo: string
          user_id: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          dia_inteiro?: boolean
          fim?: string | null
          id?: string
          local?: string | null
          notas?: string | null
          projeto_id?: string | null
          quando?: string
          tipo?: string | null
          tipo_ev?: Database["public"]["Enums"]["evento_tipo"]
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_agenda_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_agenda_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      historico: {
        Row: {
          cliente_id: string
          created_at: string
          descricao: string
          id: string
          meta: Json
          origem_ia: boolean
          tipo: string
          user_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          descricao: string
          id?: string
          meta?: Json
          origem_ia?: boolean
          tipo: string
          user_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          descricao?: string
          id?: string
          meta?: Json
          origem_ia?: boolean
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_pipeline: {
        Row: {
          cliente_id: string | null
          created_at: string
          etapa: string
          id: string
          motivo_perda: string | null
          user_id: string
          valor_potencial: number | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          etapa: string
          id?: string
          motivo_perda?: string | null
          user_id: string
          valor_potencial?: number | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          etapa?: string
          id?: string
          motivo_perda?: string | null
          user_id?: string
          valor_potencial?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_pipeline_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_financeiras: {
        Row: {
          created_at: string
          id: string
          mes: string
          user_id: string
          valor_meta: number
        }
        Insert: {
          created_at?: string
          id?: string
          mes: string
          user_id: string
          valor_meta?: number
        }
        Update: {
          created_at?: string
          id?: string
          mes?: string
          user_id?: string
          valor_meta?: number
        }
        Relationships: []
      }
      projeto_notas: {
        Row: {
          created_at: string
          id: string
          prioridade: boolean
          projeto_id: string
          texto: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prioridade?: boolean
          projeto_id: string
          texto: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prioridade?: boolean
          projeto_id?: string
          texto?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projeto_notas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      projetos: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_entrega: string | null
          id: string
          moeda: Database["public"]["Enums"]["moeda"]
          progresso: number
          risco_atraso: number | null
          status: Database["public"]["Enums"]["projeto_status"]
          titulo: string
          user_id: string
          valor: number | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_entrega?: string | null
          id?: string
          moeda?: Database["public"]["Enums"]["moeda"]
          progresso?: number
          risco_atraso?: number | null
          status?: Database["public"]["Enums"]["projeto_status"]
          titulo: string
          user_id: string
          valor?: number | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_entrega?: string | null
          id?: string
          moeda?: Database["public"]["Enums"]["moeda"]
          progresso?: number
          risco_atraso?: number | null
          status?: Database["public"]["Enums"]["projeto_status"]
          titulo?: string
          user_id?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projetos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      recebimentos: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_pagamento: string | null
          descricao: string | null
          id: string
          moeda: Database["public"]["Enums"]["moeda"]
          projeto_id: string | null
          risco_ia: number | null
          status: Database["public"]["Enums"]["recebimento_status"]
          user_id: string
          valor: number
          valor_pago: number
          vencimento: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          descricao?: string | null
          id?: string
          moeda?: Database["public"]["Enums"]["moeda"]
          projeto_id?: string | null
          risco_ia?: number | null
          status?: Database["public"]["Enums"]["recebimento_status"]
          user_id: string
          valor: number
          valor_pago?: number
          vencimento?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          descricao?: string | null
          id?: string
          moeda?: Database["public"]["Enums"]["moeda"]
          projeto_id?: string | null
          risco_ia?: number | null
          status?: Database["public"]["Enums"]["recebimento_status"]
          user_id?: string
          valor?: number
          valor_pago?: number
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recebimentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimentos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      sessoes_foco: {
        Row: {
          categoria: Database["public"]["Enums"]["sessao_categoria"]
          duracao_seg: number
          finalizada_em: string
          id: string
          iniciada_em: string
          projeto_id: string | null
          rotulo: string | null
          tipo: Database["public"]["Enums"]["sessao_tipo"]
          user_id: string
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["sessao_categoria"]
          duracao_seg: number
          finalizada_em?: string
          id?: string
          iniciada_em?: string
          projeto_id?: string | null
          rotulo?: string | null
          tipo?: Database["public"]["Enums"]["sessao_tipo"]
          user_id: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["sessao_categoria"]
          duracao_seg?: number
          finalizada_em?: string
          id?: string
          iniciada_em?: string
          projeto_id?: string | null
          rotulo?: string | null
          tipo?: Database["public"]["Enums"]["sessao_tipo"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_foco_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          concluida: boolean
          created_at: string
          descricao: string | null
          etapa_id: string
          id: string
          ordem: number
          projeto_id: string
          tipo: Database["public"]["Enums"]["tarefa_tipo"]
          titulo: string
          user_id: string
        }
        Insert: {
          concluida?: boolean
          created_at?: string
          descricao?: string | null
          etapa_id: string
          id?: string
          ordem?: number
          projeto_id: string
          tipo?: Database["public"]["Enums"]["tarefa_tipo"]
          titulo: string
          user_id: string
        }
        Update: {
          concluida?: boolean
          created_at?: string
          descricao?: string | null
          etapa_id?: string
          id?: string
          ordem?: number
          projeto_id?: string
          tipo?: Database["public"]["Enums"]["tarefa_tipo"]
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas_dia: {
        Row: {
          concluida_em: string | null
          created_at: string
          data_finalizar: string | null
          id: string
          ordem: number
          status: Database["public"]["Enums"]["tarefa_dia_status"]
          titulo: string
          user_id: string
        }
        Insert: {
          concluida_em?: string | null
          created_at?: string
          data_finalizar?: string | null
          id?: string
          ordem?: number
          status?: Database["public"]["Enums"]["tarefa_dia_status"]
          titulo: string
          user_id: string
        }
        Update: {
          concluida_em?: string | null
          created_at?: string
          data_finalizar?: string | null
          id?: string
          ordem?: number
          status?: Database["public"]["Enums"]["tarefa_dia_status"]
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          funcao: string | null
          id: string
          nome: string
          role: Database["public"]["Enums"]["user_role"]
          telefone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          funcao?: string | null
          id: string
          nome: string
          role?: Database["public"]["Enums"]["user_role"]
          telefone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          funcao?: string | null
          id?: string
          nome?: string
          role?: Database["public"]["Enums"]["user_role"]
          telefone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      assinatura_status: "ativa" | "retry" | "inadimplente" | "cancelada"
      cliente_status:
        | "lead"
        | "qualificado"
        | "proposta"
        | "negociacao"
        | "cliente"
        | "recorrente"
        | "frio"
        | "perdido"
      etapa_status: "prevista" | "em_andamento" | "concluida" | "atrasada"
      evento_tipo: "reuniao" | "lembrete" | "bloco" | "entrega"
      moeda: "BRL" | "USD" | "EUR"
      projeto_status:
        | "briefing"
        | "proposta"
        | "aprovado"
        | "dev"
        | "revisao"
        | "entrega"
        | "concluido"
      recebimento_status:
        | "em_dia"
        | "agendado"
        | "atrasado"
        | "pago"
        | "recorrente"
        | "parcial"
      risco_nivel: "baixo" | "medio" | "alto"
      sessao_categoria: "trabalho" | "estudo"
      sessao_tipo: "foco" | "pausa_curta" | "pausa_longa"
      tarefa_dia_status: "pendente" | "em_andamento" | "concluida"
      tarefa_tipo: "dev" | "design" | "conteudo" | "reuniao" | "bug"
      user_role: "admin" | "gestor" | "colaborador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      assinatura_status: ["ativa", "retry", "inadimplente", "cancelada"],
      cliente_status: [
        "lead",
        "qualificado",
        "proposta",
        "negociacao",
        "cliente",
        "recorrente",
        "frio",
        "perdido",
      ],
      etapa_status: ["prevista", "em_andamento", "concluida", "atrasada"],
      evento_tipo: ["reuniao", "lembrete", "bloco", "entrega"],
      moeda: ["BRL", "USD", "EUR"],
      projeto_status: [
        "briefing",
        "proposta",
        "aprovado",
        "dev",
        "revisao",
        "entrega",
        "concluido",
      ],
      recebimento_status: [
        "em_dia",
        "agendado",
        "atrasado",
        "pago",
        "recorrente",
        "parcial",
      ],
      risco_nivel: ["baixo", "medio", "alto"],
      sessao_categoria: ["trabalho", "estudo"],
      sessao_tipo: ["foco", "pausa_curta", "pausa_longa"],
      tarefa_dia_status: ["pendente", "em_andamento", "concluida"],
      tarefa_tipo: ["dev", "design", "conteudo", "reuniao", "bug"],
      user_role: ["admin", "gestor", "colaborador"],
    },
  },
} as const
