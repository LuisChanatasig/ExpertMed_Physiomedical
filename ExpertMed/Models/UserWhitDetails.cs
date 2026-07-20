using System;
using System.Collections.Generic;
using System.Linq;

namespace ExpertMed.Models
{
    public class UserWithDetails
    {
        // --- Datos de Identidad ---
        public int UserId { get; set; }
        public int ProfileId { get; set; }
        public string ProfileName { get; set; }
        public string DocumentNumber { get; set; }
        public string Names { get; set; }
        public string Surnames { get; set; }
        public string FullName => $"{Names} {Surnames}";
        public string Login { get; set; }
        public string Password { get; set; }
        public int Status { get; set; }

        // --- Datos de Contacto y Ubicación ---
        public string Email { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public int? UserCountryid { get; set; }
        public string CountryName { get; set; }

        // --- Datos Profesionales ---
        public int? UserSpecialtyid { get; set; }
        public string SpecialtyName { get; set; }
        public string? SenecytCode { get; set; }
        public string? UserDescription { get; set; }
        public string? XKeyTaxo { get; set; }
        public string? XPassTaxo { get; set; } // Nota: Manejar con precaución (ISO 27001)

        // --- Configuración de Facturación / Establecimiento ---
        public int? UserEstablishmentid { get; set; }
        public int? UserVatpercentageid { get; set; }
        public int SequentialBilling { get; set; }
        public string? EstablishmentName { get; set; }
        public string? EstablishmentAddress { get; set; }
        public string? EstablishmentPointofsale { get; set; }
        public string? EstablishmentEmissionPoint { get; set; }

        // --- Horarios de Atención ---
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public int AppointmentInterval { get; set; }

        // --- Auditoría ---
        public DateTime CreationDate { get; set; }
        public DateTime? ModificationDate { get; set; }

        // --- Foto de Perfil ---
        public byte[]? ProfilePhoto { get; set; }
        public string ProfilePhoto64 { get; set; }

        // --- Listas Relacionadas (Inicializadas para evitar NullReferenceException) ---
        public List<UserScheduleDayDto> ScheduleDays { get; set; } = new();
        public List<UserFileDto> UserFiles { get; set; } = new();
        public List<MedicalOfficeDto> MedicalOffices { get; set; } = new();
        public List<DoctorDto> Doctors { get; set; } = new();

        // --- Helpers para UI: Conversión automática de archivos a Base64 ---

        public string? CompanyLogoBase64 => GetFileBase64("logotipo", "image/png");

        public string? CompanySignatureBase64 => GetFileBase64("firma", "image/png");

        public string? CompanyStampBase64 => GetFileBase64("sello", "image/png");

        public string? CertificateP12Base64 => GetFileBase64("certificado_p12", "application/x-pkcs12");

        /// <summary>
        /// Método privado para buscar un archivo en la lista y convertirlo a string base64 para el frontend.
        /// </summary>
        private string? GetFileBase64(string type, string mimeType)
        {
            var file = UserFiles?.FirstOrDefault(f => f.FileType.Equals(type, StringComparison.OrdinalIgnoreCase));
            if (file?.FileContent == null || file.FileContent.Length == 0) return null;

            return $"data:{mimeType};base64,{Convert.ToBase64String(file.FileContent)}";
        }
    }

    // --- DTOs Complementarios ---

    public class UserScheduleDayDto
    {
        public int ScheduleDayId { get; set; }
        public int ScheduleId { get; set; }
        public string WorkingDay { get; set; } // Ejemplo: "Lunes", "Martes"
    }

    public class UserFileDto
    {
        public string FileType { get; set; } // logotipo, firma, sello, certificado_p12
        public string FileName { get; set; }
        public byte[] FileContent { get; set; }
        public string ContentType { get; set; }
    }

    public class MedicalOfficeDto
    {
        public int OfficeId { get; set; }
        public string OfficeName { get; set; }
        public string OfficeLocation { get; set; }
    }

    public class DoctorDto
    {
        public int DoctorId { get; set; }
        public string DoctorNames { get; set; }
        public string DoctorSurnames { get; set; }
        public string FullDoctorName => $"{DoctorNames} {DoctorSurnames}";
        public int DoctorSpecialtyId { get; set; }
        public string DoctorSpecialtyName { get; set; }
    }
}